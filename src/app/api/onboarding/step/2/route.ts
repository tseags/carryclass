import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  normalizeClassTypeDrafts,
  normalizeFeeDrafts,
} from "@/lib/instructor-catalog";
import {
  getVendorProfile,
  saveCheckoutFees,
  saveClassTypes,
  advanceOnboardingStep,
  getClassTypes,
  UpcomingSessionsBlockDeleteError,
} from "@/lib/onboarding-db";
import { syncLiveScheduleForPublishedVendor } from "@/lib/publish-vendor-live";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json();
  const normalized = normalizeClassTypeDrafts(body.classTypes);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const allowed = new Set(normalized.types.map((type) => type.class_type));
  let fees = null;
  if (body.checkoutFees !== undefined) {
    const normalizedFees = normalizeFeeDrafts(body.checkoutFees, allowed);
    if (!normalizedFees.ok) {
      return NextResponse.json({ error: normalizedFees.error }, { status: 400 });
    }
    fees = normalizedFees.fees;
  }

  try {
    await saveClassTypes(vendor.id, normalized.types, Boolean(body.replaceCustom));
    if (fees) await saveCheckoutFees(vendor.id, fees);
  } catch (error) {
    if (error instanceof UpcomingSessionsBlockDeleteError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to save classes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (body.mode === "dashboard") {
    try {
      await syncLiveScheduleForPublishedVendor(vendor);
    } catch (syncError) {
      console.error("[onboarding/step/2] live sync failed after class save:", syncError);
    }
  } else {
    await advanceOnboardingStep(vendor.id, 3);
  }

  const updated = await getClassTypes(vendor.id);
  return NextResponse.json({ ok: true, classTypes: updated });
}
