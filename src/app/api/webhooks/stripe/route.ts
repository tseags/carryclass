import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { fulfillPaidCheckoutSession } from "@/lib/fulfill-paid-booking";
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
    try {
      // Idempotent with the success page, which fulfills the same session when
      // this webhook never arrives (local test mode has no endpoint).
      await fulfillPaidCheckoutSession(session);
    } catch (e: unknown) {
      console.error("Webhook booking fulfillment failed", e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
