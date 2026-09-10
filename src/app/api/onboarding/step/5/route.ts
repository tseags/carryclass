import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, advanceOnboardingStep } from "@/lib/onboarding-db";
import { acceptsBookingsFromStripe } from "@/lib/publish-vendor-live-map";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  // Stripe Connect is optional: instructors may publish a listing-only profile.
  // Bookings stay off until `stripe_account_id` exists (see publish-vendor-live-map).
  await advanceOnboardingStep(vendor.id, 6);

  return NextResponse.json({
    ok: true,
    acceptsBookings: acceptsBookingsFromStripe(vendor.stripe_account_id),
  });
}
