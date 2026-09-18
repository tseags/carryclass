import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";
import { getGoogleAccessToken } from "@/lib/google-calendar-auth";

const ALLOWED_WINDOWS = new Set([30, 60, 90, 180]);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  if (!vendor.google_refresh_token) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const calendarId =
    searchParams.get("calendarId")?.trim() || vendor.google_calendar_id || "primary";
  const daysRaw = Number(searchParams.get("days") ?? "90");
  const days = ALLOWED_WINDOWS.has(daysRaw) ? daysRaw : 90;

  try {
    const accessToken = await getGoogleAccessToken(vendor.google_refresh_token);

    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: cutoff.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!eventsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google Calendar events" },
        { status: 500 }
      );
    }

    const data = await eventsRes.json();
    const events = (data.items ?? []).map(
      (item: {
        id: string;
        summary: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
        recurrence?: string[];
      }) => ({
        external_event_id: item.id,
        title: item.summary ?? "(No title)",
        start_time: item.start.dateTime ?? `${item.start.date}T00:00:00Z`,
        end_time: item.end.dateTime ?? `${item.end.date}T23:59:59Z`,
        is_recurring: Boolean(item.recurrence?.length),
        recurrence_rule: item.recurrence?.[0] ?? null,
        all_day: Boolean(item.start.date && !item.start.dateTime),
      })
    );

    return NextResponse.json({
      events,
      count: events.length,
      calendarId,
      days,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch Google Calendar events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
