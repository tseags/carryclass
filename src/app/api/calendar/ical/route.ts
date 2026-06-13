import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import ICAL from "ical.js";

interface CalendarEvent {
  external_event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  let icsText: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CarryClass/1.0 Calendar Sync" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch calendar (HTTP ${res.status})` },
        { status: 400 }
      );
    }
    icsText = await res.text();
  } catch {
    return NextResponse.json(
      { error: "Could not fetch the calendar feed. Check the URL and try again." },
      { status: 400 }
    );
  }

  let events: CalendarEvent[] = [];
  try {
    const jcalData = ICAL.parse(icsText);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    const now = new Date();
    const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const uid = vevent.getFirstPropertyValue("uid") as string | null;
      const dtstart = event.startDate;
      const dtend = event.endDate;

      if (!dtstart || !dtend) continue;

      const startDate = dtstart.toJSDate();
      if (startDate < now || startDate > cutoff) continue;

      const rrule = vevent.getFirstPropertyValue("rrule");

      events.push({
        external_event_id: uid ?? `ical_${startDate.getTime()}`,
        title: event.summary ?? "Class",
        start_time: dtstart.toJSDate().toISOString(),
        end_time: dtend.toJSDate().toISOString(),
        is_recurring: Boolean(rrule),
        recurrence_rule: rrule ? String(rrule) : null,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to parse calendar file. Make sure the URL points to a valid .ics feed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ events, count: events.length });
}
