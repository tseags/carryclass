import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { Prisma } from "@prisma/client";
import {
  applicableFeeSnapshots,
  buildCheckoutAmounts,
  buildCheckoutLines,
} from "@/lib/instructor-catalog";
import { getOnboardingPublicCatalog } from "@/lib/public-instructor-classes";
import { normalizeListingPhone } from "@/lib/claim-contacts";

export const runtime = "nodejs";

type Body = {
  classSessionId?: string;
  firstName?: string;
  lastName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  vendorSlug?: string;
};

function formatUsPhone(raw: string): string | null {
  const ten = normalizeListingPhone(raw);
  if (ten.length !== 10) return null;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payments are not configured (missing STRIPE_SECRET_KEY)." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const classSessionId = body.classSessionId?.trim();
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const customerEmail = body.customerEmail?.trim()?.toLowerCase();
  const customerPhone = formatUsPhone(body.customerPhone ?? "");
  const vendorSlug = body.vendorSlug?.trim();

  if (!classSessionId || !firstName || !lastName || !customerEmail || !vendorSlug) {
    return NextResponse.json(
      { error: "Missing class, first name, last name, email, or instructor." },
      { status: 400 }
    );
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (!customerPhone) {
    return NextResponse.json({ error: "Enter a 10-digit phone number." }, { status: 400 });
  }

  const customerName = `${firstName} ${lastName}`;

  const { userId } = await auth();

  const classSession = await prisma.classSession.findFirst({
    where: { id: classSessionId },
    include: { vendor: true },
  });

  if (!classSession) {
    return NextResponse.json({ error: "Class session not found." }, { status: 404 });
  }
  if (classSession.vendor.slug !== vendorSlug) {
    return NextResponse.json({ error: "Session does not match vendor." }, { status: 400 });
  }
  if (!classSession.vendor.acceptsBookings) {
    return NextResponse.json({ error: "Booking is not enabled for this vendor." }, { status: 400 });
  }
  if (!classSession.vendor.stripeConnectAccountId) {
    return NextResponse.json(
      { error: "This vendor is not set up to accept payments yet." },
      { status: 503 }
    );
  }
  if (classSession.vendor.stripeConnectAccountId.startsWith("acct_") === false) {
    return NextResponse.json(
      { error: "Invalid vendor Stripe Connect account." },
      { status: 503 }
    );
  }
  if (classSession.enrolled >= classSession.capacity) {
    return NextResponse.json({ error: "This class is full." }, { status: 409 });
  }
  if (classSession.startsAt <= new Date()) {
    return NextResponse.json({ error: "This class has already started." }, { status: 400 });
  }

  let catalog: Awaited<ReturnType<typeof getOnboardingPublicCatalog>> = null;
  try {
    catalog = await getOnboardingPublicCatalog(classSession.vendor.slug);
  } catch (error) {
    console.error("[bookings/checkout] class catalog failed", error);
    return NextResponse.json(
      { error: "Could not load this class. Try again." },
      { status: 503 }
    );
  }
  if (catalog) {
    const offered = [...catalog.ccw, ...catalog.other];
    if (offered.length > 0 && !offered.some((card) => card.key === classSession.classType)) {
      return NextResponse.json({ error: "This class is not available." }, { status: 400 });
    }
  }

  const classAmountCents = classSession.priceCents;
  const feeRules = catalog?.fees ?? [];
  const passThrough = applicableFeeSnapshots(feeRules, classSession.classType);
  const amounts = buildCheckoutAmounts(classAmountCents, passThrough);
  const lines = buildCheckoutLines({
    tuitionName: `${classSession.vendor.name} — ${
      classSession.title ??
      (classSession.classType === "initial"
        ? "16hr Initial CCW"
        : classSession.classType === "add_a_gun"
          ? "Add a gun"
          : classSession.classType === "renewal"
            ? "8hr Renewal"
            : "Class")
    }`,
    tuitionDescription: `Class date: ${classSession.startsAt.toISOString()}`,
    feeNotes: feeRules.map((fee) => ({ id: fee.id, note: fee.note })),
    amounts,
  }).filter((line) => line.unitAmountCents > 0);

  const snapshot = await prisma.checkoutFeeSnapshot.create({
    data: {
      classSessionId: classSession.id,
      classAmountCents: amounts.classTuitionCents,
      serviceFeeCents: amounts.platformFeeCents,
      passThroughFees: amounts.passThrough as Prisma.InputJsonValue,
    },
  });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(req.url).origin;

  const stripe = getStripe();

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "custom",
      excluded_payment_method_types: ["amazon_pay"],
      customer_email: customerEmail,
      line_items: lines.map((line) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: line.name,
            ...(line.description ? { description: line.description } : {}),
          },
          unit_amount: line.unitAmountCents,
        },
        quantity: 1,
      })),
      payment_intent_data: {
        application_fee_amount: amounts.platformFeeCents,
        receipt_email: customerEmail,
        transfer_data: {
          destination: classSession.vendor.stripeConnectAccountId,
        },
      },
      return_url: `${origin}/instructors/${classSession.vendor.slug}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        classSessionId: classSession.id,
        vendorId: classSession.vendorId,
        customerName,
        customerFirstName: firstName,
        customerEmail,
        customerPhone,
        clerkUserId: userId ?? "",
        classAmountCents: String(amounts.classTuitionCents),
        serviceFeeCents: String(amounts.platformFeeCents),
        passThroughCents: String(amounts.passThroughCents),
        feeSnapshotId: snapshot.id,
      },
    });
  } catch (error) {
    await prisma.checkoutFeeSnapshot.delete({ where: { id: snapshot.id } }).catch(() => undefined);
    console.error("[bookings/checkout] stripe session failed", error);
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }

  if (!checkoutSession.client_secret) {
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientSecret: checkoutSession.client_secret,
    sessionId: checkoutSession.id,
  });
}
