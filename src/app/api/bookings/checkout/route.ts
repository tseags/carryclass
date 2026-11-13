import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { Prisma } from "@prisma/client";
import { buildCheckoutLines } from "@/lib/instructor-catalog";
import { getOnboardingPublicCatalog } from "@/lib/public-instructor-classes";
import { normalizeListingPhone } from "@/lib/claim-contacts";
import {
  buildCartCheckoutAmounts,
  normalizeClassSessionIds,
  sessionDisplayTitle,
  validateCheckoutCart,
  type CartSessionLike,
} from "@/lib/booking-cart";

export const runtime = "nodejs";

type Body = {
  classSessionId?: string;
  classSessionIds?: string[];
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

  const classSessionIds = normalizeClassSessionIds(body);
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const customerEmail = body.customerEmail?.trim()?.toLowerCase();
  const customerPhone = formatUsPhone(body.customerPhone ?? "");
  const vendorSlug = body.vendorSlug?.trim();

  if (classSessionIds.length === 0 || !firstName || !lastName || !customerEmail || !vendorSlug) {
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

  const classSessions = await prisma.classSession.findMany({
    where: { id: { in: classSessionIds } },
    include: { vendor: true },
  });

  if (classSessions.length !== classSessionIds.length) {
    return NextResponse.json({ error: "Class session not found." }, { status: 404 });
  }

  const vendor = classSessions[0]!.vendor;
  if (classSessions.some((s) => s.vendorId !== vendor.id)) {
    return NextResponse.json({ error: "Sessions must belong to one instructor." }, { status: 400 });
  }
  if (vendor.slug !== vendorSlug) {
    return NextResponse.json({ error: "Session does not match vendor." }, { status: 400 });
  }
  if (!vendor.acceptsBookings) {
    return NextResponse.json({ error: "Booking is not enabled for this vendor." }, { status: 400 });
  }
  if (!vendor.stripeConnectAccountId) {
    return NextResponse.json(
      { error: "This vendor is not set up to accept payments yet." },
      { status: 503 }
    );
  }
  if (vendor.stripeConnectAccountId.startsWith("acct_") === false) {
    return NextResponse.json(
      { error: "Invalid vendor Stripe Connect account." },
      { status: 503 }
    );
  }

  const cartSessions: CartSessionLike[] = classSessionIds.map((id) => {
    const row = classSessions.find((s) => s.id === id)!;
    return {
      id: row.id,
      classType: row.classType,
      startsAt: row.startsAt,
      timezone: row.timezone,
      priceCents: row.priceCents,
      dayIndex: row.dayIndex,
      enrolled: row.enrolled,
      capacity: row.capacity,
      title: row.title,
    };
  });

  const vendorInitialRows = await prisma.classSession.findMany({
    where: {
      vendorId: vendor.id,
      classType: "initial",
      startsAt: { gt: new Date() },
    },
    select: {
      id: true,
      classType: true,
      startsAt: true,
      timezone: true,
      priceCents: true,
      dayIndex: true,
      enrolled: true,
      capacity: true,
      title: true,
    },
  });
  const availableInitial: CartSessionLike[] = vendorInitialRows.map((row) => ({
    id: row.id,
    classType: row.classType,
    startsAt: row.startsAt,
    timezone: row.timezone,
    priceCents: row.priceCents,
    dayIndex: row.dayIndex,
    enrolled: row.enrolled,
    capacity: row.capacity,
    title: row.title,
  }));

  const validated = validateCheckoutCart(cartSessions, availableInitial);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validated.status ?? 400 }
    );
  }

  let catalog: Awaited<ReturnType<typeof getOnboardingPublicCatalog>> = null;
  try {
    catalog = await getOnboardingPublicCatalog(vendor.slug);
  } catch (error) {
    console.error("[bookings/checkout] class catalog failed", error);
    return NextResponse.json(
      { error: "Could not load this class. Try again." },
      { status: 503 }
    );
  }
  if (catalog) {
    const offered = [...catalog.ccw, ...catalog.other];
    if (offered.length > 0) {
      for (const session of validated.sessions) {
        if (!offered.some((card) => card.key === session.classType)) {
          return NextResponse.json({ error: "This class is not available." }, { status: 400 });
        }
      }
    }
  }

  const catalogInitialPriceCents =
    catalog?.ccw.find((card) => card.key === "initial")?.priceCents ??
    vendor.priceInitial ??
    null;

  const feeRules = catalog?.fees ?? [];
  const amounts = buildCartCheckoutAmounts(
    validated.sessions,
    feeRules,
    catalogInitialPriceCents
  );

  const tuitionNameParts = validated.sessions.map((s) => sessionDisplayTitle(s));
  const tuitionName =
    validated.sessions.length === 1
      ? `${vendor.name} — ${tuitionNameParts[0]}`
      : `${vendor.name} — ${tuitionNameParts.join(" + ")}`;
  const tuitionDescription = validated.sessions
    .map((s) => `${sessionDisplayTitle(s)}: ${s.startsAt.toISOString()}`)
    .join("; ");

  const lines = buildCheckoutLines({
    tuitionName,
    tuitionDescription,
    feeNotes: feeRules.map((fee) => ({ id: fee.id, note: fee.note })),
    amounts,
  }).filter((line) => line.unitAmountCents > 0);

  const primary = validated.primary;
  const snapshot = await prisma.checkoutFeeSnapshot.create({
    data: {
      classSessionId: primary.id,
      classAmountCents: amounts.classTuitionCents,
      serviceFeeCents: amounts.platformFeeCents,
      passThroughFees: amounts.passThrough as Prisma.InputJsonValue,
    },
  });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(req.url).origin;

  const stripe = getStripe();
  const orderedIds = validated.sessions.map((s) => s.id);

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
          destination: vendor.stripeConnectAccountId,
        },
      },
      return_url: `${origin}/instructors/${vendor.slug}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        classSessionId: primary.id,
        classSessionIds: orderedIds.join(","),
        vendorId: vendor.id,
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
