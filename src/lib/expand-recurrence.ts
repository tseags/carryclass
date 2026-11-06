/**
 * Turn a stored class RRULE into concrete start times.
 *
 * Instructors pick weekly, every 2 weeks, or monthly, with an optional end
 * date. Open-ended series are materialized for the next
 * OPEN_ENDED_RECURRENCE_MONTHS so each date can be booked. The nightly
 * calendar sync rebuilds that window, which keeps an ongoing series on the
 * public calendar.
 */

export const SESSION_TIME_ZONE = "America/Los_Angeles";

/** How far ahead an open-ended series is bookable. Refreshed by the daily cron. */
export const OPEN_ENDED_RECURRENCE_MONTHS = 24;

/** Safety stop for a very long explicit end date. */
export const MAX_RECURRENCE_OCCURRENCES = 500;

export type ClassOccurrence = {
  startsAt: Date;
  endsAt: Date | null;
};

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function expandClassOccurrences(input: {
  start: Date;
  end: Date | null;
  recurrenceRule: string | null;
  now?: Date;
}): ClassOccurrence[] {
  const start = input.start;
  const end = input.end;
  if (!Number.isFinite(start.getTime())) return [];

  const single: ClassOccurrence[] = [{ startsAt: start, endsAt: end }];
  const rule = parseRule(input.recurrenceRule);
  if (!rule) return single;

  const freq = rule.get("FREQ");
  if (freq !== "WEEKLY" && freq !== "MONTHLY") return single;

  const interval = positiveInt(rule.get("INTERVAL"), 1);
  const count = positiveInt(rule.get("COUNT"), 0);
  const now = input.now ?? new Date();
  const until = parseUntil(rule.get("UNTIL"));
  const horizon = addMonthsUtc(now, OPEN_ENDED_RECURRENCE_MONTHS);
  const bound = until ?? horizon;
  const durationMs =
    end && Number.isFinite(end.getTime()) ? end.getTime() - start.getTime() : null;
  const anchor = wallInZone(start, SESSION_TIME_ZONE);

  const out: ClassOccurrence[] = [];
  let produced = 0;

  for (let index = 0; index < MAX_RECURRENCE_OCCURRENCES; index += 1) {
    const stepped =
      freq === "WEEKLY"
        ? addDays(anchor, index * 7 * interval)
        : addMonths(anchor, index * interval);
    if (!stepped) continue;

    const occurs = index === 0 ? new Date(start.getTime()) : wallToUtc(stepped, SESSION_TIME_ZONE);
    if (occurs.getTime() > bound.getTime()) break;

    produced += 1;
    if (count > 0 && produced > count) break;

    if (occurs.getTime() > now.getTime()) {
      out.push({
        startsAt: occurs,
        endsAt:
          durationMs != null && durationMs > 0
            ? new Date(occurs.getTime() + durationMs)
            : null,
      });
    }
  }

  return out;
}

/** Short label for a rule saved by the Add Class / onboarding selectors. */
export function describeStoredRecurrence(rule: string | null | undefined): string {
  const parts = parseRule(rule);
  if (!parts) return "Recurring";
  const freq = parts.get("FREQ");
  const interval = positiveInt(parts.get("INTERVAL"), 1);
  let label = "Recurring";
  if (freq === "WEEKLY" && interval === 2) label = "Every 2 weeks";
  else if (freq === "WEEKLY" && interval === 1) label = "Weekly";
  else if (freq === "WEEKLY") label = `Every ${interval} weeks`;
  else if (freq === "MONTHLY" && interval === 1) label = "Monthly";
  else if (freq === "MONTHLY") label = `Every ${interval} months`;

  const until = parseUntil(parts.get("UNTIL"));
  if (!until) return `${label}, ongoing`;
  const through = new Intl.DateTimeFormat("en-US", {
    timeZone: SESSION_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(until);
  return `${label} through ${through}`;
}

function parseRule(rule: string | null | undefined): Map<string, string> | null {
  if (!rule?.trim()) return null;
  const body = rule.trim().replace(/^RRULE:/i, "");
  const map = new Map<string, string>();
  for (const part of body.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim().toUpperCase();
    const value = part.slice(eq + 1).trim().toUpperCase();
    if (key && value) map.set(key, value);
  }
  return map.size ? map : null;
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** UNTIL from the Add Class form is `YYYYMMDDTHHMMSSZ`. */
function parseUntil(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (match[4]) {
    return new Date(Date.UTC(year, month - 1, day, Number(match[4]), Number(match[5]), Number(match[6])));
  }
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
}

function addMonthsUtc(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function wallInZone(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const wall = wallInZone(date, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - date.getTime();
}

function wallToUtc(wall: WallClock, timeZone: string): Date {
  const utcGuess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const offset = zoneOffsetMs(new Date(utcGuess), timeZone);
  let utc = utcGuess - offset;
  const offsetAtResult = zoneOffsetMs(new Date(utc), timeZone);
  if (offsetAtResult !== offset) utc = utcGuess - offsetAtResult;
  return new Date(utc);
}

function addDays(wall: WallClock, days: number): WallClock {
  const shifted = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: wall.hour,
    minute: wall.minute,
    second: wall.second,
  };
}

/** Same day-of-month, or null when that day does not exist (Jan 31 → February). */
function addMonths(wall: WallClock, months: number): WallClock | null {
  const total = wall.month - 1 + months;
  const year = wall.year + Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  const dim = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  if (wall.day > dim) return null;
  return {
    year,
    month: monthIndex + 1,
    day: wall.day,
    hour: wall.hour,
    minute: wall.minute,
    second: wall.second,
  };
}
