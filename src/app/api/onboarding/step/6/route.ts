import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCalendarClasses,
  getClassTypes,
  getVendorProfile,
  updateVendorProfile,
} from "@/lib/onboarding-db";
import { syncPublishedVendorToLive } from "@/lib/publish-vendor-live";
import { revalidatePublishedVendorPaths } from "@/lib/publish-vendor-revalidate";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { publish } = await req.json();

  if (publish) {
    if (!vendor.slug?.trim()) {
      return NextResponse.json(
        { error: "Cannot publish without a claimed listing. Complete claim first." },
        { status: 400 }
      );
    }

    try {
      const [classTypes, calendarClasses] = await Promise.all([
        getClassTypes(vendor.id),
        getCalendarClasses(vendor.id),
      ]);
      const syncResult = await syncPublishedVendorToLive({
        profile: vendor,
        classTypes,
        calendarClasses,
      });
      if (syncResult.skipped) {
        console.warn(
          `[onboarding/step/6] Published onboarding without live sync (allowlist) for slug="${syncResult.slug}"`
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sync listing for publish";
      console.error("[onboarding/step/6] publish sync failed:", error);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    await updateVendorProfile(vendor.id, {
      is_published: true,
      onboarding_step: 7,
    });

    revalidatePublishedVendorPaths(vendor.slug);
  }

  return NextResponse.json({ ok: true });
}
