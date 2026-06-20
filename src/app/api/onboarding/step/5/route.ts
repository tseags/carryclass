import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, advanceOnboardingStep } from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  if (!vendor.stripe_account_id) {
    return NextResponse.json(
      { error: "Stripe must be connected before continuing" },
      { status: 400 }
    );
  }

  await advanceOnboardingStep(vendor.id, 6);

  return NextResponse.json({ ok: true });
}
