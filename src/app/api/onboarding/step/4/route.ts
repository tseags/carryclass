import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile, advanceOnboardingStep } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { policy, hours, refundPercent } = await req.json();

  const validPolicies = ["none", "anytime", "full_hours_before", "partial_hours_before"];
  if (!validPolicies.includes(policy)) {
    return NextResponse.json({ error: "Invalid policy" }, { status: 400 });
  }

  await updateVendorProfile(vendor.id, {
    cancellation_policy: policy,
    cancellation_hours: hours ?? null,
    cancellation_refund_percent: refundPercent ?? null,
  });

  await advanceOnboardingStep(vendor.id, 5);

  return NextResponse.json({ ok: true });
}
