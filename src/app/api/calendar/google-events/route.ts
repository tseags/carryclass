import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile } from "@/lib/onboarding-db";

export async function GET(req: NextRequest) {
  void req;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getVendorProfile(userId);
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  if (!vendor.google_refresh_token || !vendor.google_calendar_id) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  // Exchange refresh token for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: vendor.google_refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "Failed to refresh Google token" },
      { status: 500 }
    );
  }

  const { access_token: accessToken } = await tokenRes.json();

  const now = new Date();
  const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: cutoff.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(vendor.google_calendar_id)}/events?${params}`,
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
      title: item.summary ?? "Class",
      start_time: item.start.dateTime ?? `${item.start.date}T00:00:00Z`,
      end_time: item.end.dateTime ?? `${item.end.date}T00:00:00Z`,
      is_recurring: Boolean(item.recurrence?.length),
      recurrence_rule: item.recurrence?.[0] ?? null,
    })
  );

  return NextResponse.json({ events, count: events.length });
}
