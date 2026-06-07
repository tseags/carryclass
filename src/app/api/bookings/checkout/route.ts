import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { calculatePlatformServiceFeeCents } from "@/lib/booking-constants";

export const runtime = "nodejs";

type Body = {
  classSessionId?: string;
  customerName?: string;
  customerEmail?: string;
  vendorSlug?: string;
};

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
  const customerName = body.customerName?.trim();
  const customerEmail = body.customerEmail?.trim()?.toLowerCase();
  const vendorSlug = body.vendorSlug?.trim();

  if (!classSessionId || !customerName || !customerEmail || !vendorSlug) {
    return NextResponse.json(
      { error: "Missing classSessionId, customerName, customerEmail, or vendorSlug." },
      { status: 400 }
    );
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail);
  if (!emailOk) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

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

  const classAmountCents = classSession.priceCents;
  const serviceFeeCents = calculatePlatformServiceFeeCents(classAmountCents);

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    new URL(req.url).origin;

  const stripe = getStripe();

  const sessionTitle =
    classSession.title ??
    (classSession.classType === "initial" ? "16hr Initial CCW" : "8hr Renewal");

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${classSession.vendor.name} — ${sessionTitle}`,
            description: `Class date: ${classSession.startsAt.toISOString()}`,
          },
          unit_amount: classAmountCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "CCW Directory booking service fee",
            description: "Non-refundable 5% platform service fee",
          },
          unit_amount: serviceFeeCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: serviceFeeCents,
      transfer_data: {
        destination: classSession.vendor.stripeConnectAccountId,
      },
    },
    success_url: `${origin}/instructors/${classSession.vendor.slug}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/instructors/${classSession.vendor.slug}/book`,
    metadata: {
      classSessionId: classSession.id,
      vendorId: classSession.vendorId,
      customerName,
      customerEmail,
      clerkUserId: userId ?? "",
      classAmountCents: String(classAmountCents),
      serviceFeeCents: String(serviceFeeCents),
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: checkoutSession.url });
}
