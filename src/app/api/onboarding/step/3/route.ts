import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getVendorProfile,
  updateVendorProfile,
  insertCalendarClasses,
  advanceOnboardingStep,
} from "@/lib/onboarding-db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const { calendarType, icalFeedUrl, classes } = await req.json();

  await updateVendorProfile(vendor.id, {
    calendar_type: calendarType ?? null,
    ical_feed_url: icalFeedUrl ?? null,
  });

  if (classes?.length) {
    await insertCalendarClasses(vendor.id, classes);
  }

  await advanceOnboardingStep(vendor.id, 4);

  return NextResponse.json({ ok: true });
}
