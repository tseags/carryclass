import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Payout history for the connected Stripe account.
 *
 * TODO: this currently returns a single page (up to 20 payouts). Add cursor
 * pagination + a dedicated "payout history" screen before linking it publicly.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  if (!vendor.stripe_account_id) {
    return NextResponse.json({ connected: false, payouts: [] });
  }

  try {
    const result = await getStripe().payouts.list(
      { limit: 20 },
      { stripeAccount: vendor.stripe_account_id }
    );

    const payouts = result.data.map((p) => ({
      id: p.id,
      amountCents: p.amount,
      currency: p.currency,
      status: p.status,
      arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
    }));

    return NextResponse.json({ connected: true, payouts });
  } catch (error) {
    console.error("[api/dashboard/payouts]", error);
    return NextResponse.json(
      { connected: true, payouts: [], error: "Unable to load payout history" },
      { status: 502 }
    );
  }
}
