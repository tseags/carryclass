import { describe, expect, it } from "vitest";
import {
  OPEN_ENDED_RECURRENCE_MONTHS,
  describeStoredRecurrence,
  expandClassOccurrences,
} from "@/lib/expand-recurrence";

const TZ = "America/Los_Angeles";

function wallHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return Number(hour === "24" ? "0" : hour);
}

function wallDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addLocalDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + days));
  return shifted.toISOString().slice(0, 10);
}

describe("expandClassOccurrences", () => {
  const now = new Date("2026-11-06T20:00:00.000Z");
  // Monday Nov 9, 2026, 6:00 PM Pacific (PST).
  const start = new Date("2026-11-10T02:00:00.000Z");
  const end = new Date("2026-11-10T04:00:00.000Z");

  it("keeps a one-time class as a single session", () => {
    const occurrences = expandClassOccurrences({ start, end, recurrenceRule: null, now });
    expect(occurrences).toEqual([{ startsAt: start, endsAt: end }]);
  });

  it("repeats every 2 weeks at the same local time until the end date", () => {
    const occurrences = expandClassOccurrences({
      start,
      end,
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;UNTIL=20261124T075959Z",
      now,
    });

    expect(occurrences.map((item) => item.startsAt.toISOString())).toEqual([
      "2026-11-10T02:00:00.000Z",
      "2026-11-24T02:00:00.000Z",
    ]);
    expect(occurrences[1].endsAt?.toISOString()).toBe("2026-11-24T04:00:00.000Z");
  });

  it("keeps an open-ended series on the calendar for the rolling window", () => {
    const occurrences = expandClassOccurrences({
      start,
      end,
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
      now,
    });

    expect(occurrences.length).toBeGreaterThan(20);
    expect(occurrences[0].startsAt.toISOString()).toBe("2026-11-10T02:00:00.000Z");
    for (let i = 1; i < occurrences.length; i += 1) {
      expect(wallDay(occurrences[i].startsAt)).toBe(addLocalDays(wallDay(occurrences[i - 1].startsAt), 14));
      expect(wallHour(occurrences[i].startsAt)).toBe(18);
    }
    const horizon = new Date(now.getTime());
    horizon.setUTCMonth(horizon.getUTCMonth() + OPEN_ENDED_RECURRENCE_MONTHS);
    const last = occurrences[occurrences.length - 1].startsAt;
    expect(last.getTime()).toBeLessThanOrEqual(horizon.getTime());
    const next = expandClassOccurrences({
      start,
      end,
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
      now: new Date(last.getTime() - 1),
    }).find((item) => item.startsAt.getTime() > last.getTime());
    expect(next && next.startsAt.getTime() > horizon.getTime()).toBe(true);
  });

  it("continues a series that already started, on the original cadence", () => {
    const occurrences = expandClassOccurrences({
      start: new Date("2026-09-08T01:00:00.000Z"),
      end: new Date("2026-09-08T03:00:00.000Z"),
      recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
      now,
    });

    expect(wallDay(occurrences[0].startsAt)).toBe("2026-11-16");
    expect(wallHour(occurrences[0].startsAt)).toBe(18);
  });

  it("skips months that do not contain the monthly day", () => {
    const occurrences = expandClassOccurrences({
      start: new Date("2027-01-31T18:00:00.000Z"),
      end: new Date("2027-01-31T20:00:00.000Z"),
      recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=31;UNTIL=20270601T065959Z",
      now: new Date("2027-01-01T00:00:00.000Z"),
    });

    expect(occurrences.map((item) => wallDay(item.startsAt))).toEqual([
      "2027-01-31",
      "2027-03-31",
      "2027-05-31",
    ]);
  });
});

describe("describeStoredRecurrence", () => {
  it("describes the selector choices", () => {
    expect(describeStoredRecurrence("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO")).toBe(
      "Every 2 weeks, ongoing"
    );
    expect(
      describeStoredRecurrence("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;UNTIL=20261124T075959Z")
    ).toBe("Every 2 weeks through Nov 23, 2026");
    expect(describeStoredRecurrence("FREQ=WEEKLY;BYDAY=MO")).toBe("Weekly, ongoing");
    expect(describeStoredRecurrence("FREQ=MONTHLY;BYMONTHDAY=9")).toBe("Monthly, ongoing");
  });
});
