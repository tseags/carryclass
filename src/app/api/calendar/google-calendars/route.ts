import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { getGoogleAccessToken } from "@/lib/google-calendar-auth";

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
}

export async function GET(req: NextRequest) {
  void req;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  if (!vendor.google_refresh_token) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  try {
    const accessToken = await getGoogleAccessToken(vendor.google_refresh_token);
    const calListRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calListRes.ok) {
      return NextResponse.json(
        { error: "Failed to list Google calendars" },
        { status: 500 }
      );
    }

    const calList = await calListRes.json();
    const calendars = ((calList.items as GoogleCalendarListEntry[]) ?? [])
      .filter((c) => Boolean(c.id))
      .map((c) => ({
        id: c.id,
        name: c.summary || c.id,
        primary: Boolean(c.primary),
        accessRole: c.accessRole ?? "reader",
      }))
      .sort((a, b) => {
        if (a.primary && !b.primary) return -1;
        if (!a.primary && b.primary) return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      calendars,
      selectedCalendarId: vendor.google_calendar_id,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list Google calendars";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
