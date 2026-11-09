import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile } from "@/lib/onboarding-db";
import { normalizeBookingNotificationEmails } from "@/lib/booking-notification-prefs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  return NextResponse.json({
    enabled: vendor.booking_notification_enabled !== false,
    emails: vendor.booking_notification_emails ?? [],
    fallbackEmail: vendor.email?.trim() || null,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const enabled = body.enabled !== false;
  const normalized = normalizeBookingNotificationEmails(body.emails);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  await updateVendorProfile(vendor.id, {
    booking_notification_enabled: enabled,
    booking_notification_emails: normalized.emails.length ? normalized.emails : null,
  });

  return NextResponse.json({
    ok: true,
    enabled,
    emails: normalized.emails,
    fallbackEmail: vendor.email?.trim() || null,
  });
}
