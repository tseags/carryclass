import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { getDashboardPayments } from "@/lib/dashboard-db";
import { buildSamplePayments, paymentsSampleEnabled } from "@/lib/payments-sample";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Payments tab payload: booking ledger (tuition only), today's totals, and Stripe balance. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  try {
    if (paymentsSampleEnabled()) {
      return NextResponse.json(buildSamplePayments());
    }
    const payments = await getDashboardPayments(vendor.slug, vendor.stripe_account_id);
    return NextResponse.json(payments);
  } catch (error) {
    console.error("[api/dashboard/payments]", error);
    return NextResponse.json({ error: "Unable to load payments" }, { status: 500 });
  }
}
