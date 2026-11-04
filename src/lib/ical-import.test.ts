import { describe, expect, it } from "vitest";
import { calendarFeedFetchUrl, parseIcsEvents } from "./ical-import";

function formatIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function calendar(events: string): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join("\r\n");
}

function event(opts: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  rrule?: string;
}): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTART:${formatIcs(opts.start)}`,
    `DTEND:${formatIcs(opts.end)}`,
    `SUMMARY:${opts.summary}`,
  ];
  if (opts.rrule) lines.push(`RRULE:${opts.rrule}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

describe("calendarFeedFetchUrl", () => {
  it("rewrites webcal links to https", () => {
    expect(calendarFeedFetchUrl("webcal://example.com/cal.ics")).toBe(
      "https://example.com/cal.ics"
    );
    expect(calendarFeedFetchUrl("webcals://example.com/private.ics")).toBe(
      "https://example.com/private.ics"
    );
  });

  it("rejects non-http links", () => {
    expect(() => calendarFeedFetchUrl("file:///tmp/cal.ics")).toThrow(/valid calendar URL/);
    expect(() => calendarFeedFetchUrl("not a url")).toThrow(/valid calendar URL/);
  });
});

describe("parseIcsEvents", () => {
  const now = new Date("2026-10-31T12:00:00.000Z");

  it("keeps upcoming events inside 90 days and drops the rest", () => {
    const soon = new Date("2026-11-07T17:00:00.000Z");
    const soonEnd = new Date("2026-11-07T22:00:00.000Z");
    const later = new Date("2027-03-01T17:00:00.000Z");
    const laterEnd = new Date("2027-03-01T22:00:00.000Z");
    const past = new Date("2026-01-01T17:00:00.000Z");
    const pastEnd = new Date("2026-01-01T22:00:00.000Z");

    const events = parseIcsEvents(
      calendar([
        event({ uid: "soon", start: soon, end: soonEnd, summary: "CCW Initial" }),
        event({ uid: "later", start: later, end: laterEnd, summary: "Too far" }),
        event({ uid: "past", start: past, end: pastEnd, summary: "Already happened" }),
      ]),
      now
    );

    expect(events).toEqual([
      {
        external_event_id: "soon",
        title: "CCW Initial",
        start_time: soon.toISOString(),
        end_time: soonEnd.toISOString(),
        is_recurring: false,
        recurrence_rule: null,
      },
    ]);
  });

  it("marks recurring events", () => {
    const start = new Date("2026-11-02T16:00:00.000Z");
    const end = new Date("2026-11-02T20:00:00.000Z");
    const [parsed] = parseIcsEvents(
      calendar([
        event({
          uid: "weekly",
          start,
          end,
          summary: "Renewal",
          rrule: "FREQ=WEEKLY;BYDAY=MO",
        }),
      ]),
      now
    );

    expect(parsed.is_recurring).toBe(true);
    expect(parsed.recurrence_rule).toContain("FREQ=WEEKLY");
  });
});
