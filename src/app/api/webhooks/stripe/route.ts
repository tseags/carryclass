import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const md = session.metadata;
    if (!md?.classSessionId || !md?.vendorId) {
      console.warn("checkout.session.completed missing metadata", session.id);
      return NextResponse.json({ received: true });
    }

    const classAmountCents = parseInt(md.classAmountCents ?? "0", 10);
    const serviceFeeCents = parseInt(md.serviceFeeCents ?? "700", 10);
    const pi = session.payment_intent;
    const paymentIntentId =
      typeof pi === "string" ? pi : pi && "id" in pi ? pi.id : null;

    try {
      await prisma.$transaction(async (tx) => {
        const cs = await tx.classSession.findUnique({
          where: { id: md.classSessionId },
        });
        if (!cs) {
          throw new Error("ClassSession missing");
        }
        if (cs.enrolled >= cs.capacity) {
          throw new Error("ClassSession full");
        }

        await tx.booking.create({
          data: {
            vendorId: md.vendorId,
            classSessionId: md.classSessionId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            customerEmail: md.customerEmail ?? session.customer_email ?? "",
            customerName: md.customerName ?? "",
            clerkUserId: md.clerkUserId || null,
            classAmountCents,
            serviceFeeCents,
            totalAmountCents: session.amount_total ?? classAmountCents + serviceFeeCents,
            status: "PAID",
            paidAt: new Date(),
          },
        });

        await tx.classSession.update({
          where: { id: cs.id },
          data: { enrolled: { increment: 1 } },
        });
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error("Webhook booking transaction failed", e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
