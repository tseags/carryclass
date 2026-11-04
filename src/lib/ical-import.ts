import ICAL from "ical.js";

/** Reject oversized feeds and uploads before parsing. */
export const MAX_ICS_BYTES = 2 * 1024 * 1024;

export interface ParsedIcsEvent {
  external_event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
}

export function calendarFeedFetchUrl(raw: string): string {
  const trimmed = raw.trim();
  const normalized = trimmed.replace(/^webcals?:\/\//i, "https://");
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Enter a valid calendar URL (https:// or webcal://).");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Enter a valid calendar URL (https:// or webcal://).");
  }
  return parsed.toString();
}

/** Upcoming events in the next 90 days. Recurring events stay as a single row. */
export function parseIcsEvents(icsText: string, now = new Date()): ParsedIcsEvent[] {
  const jcalData = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents("vevent");
  const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const events: ParsedIcsEvent[] = [];

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

  return events;
}
