/**
 * Calendar helpers for instructor payment reporting. Everything is bucketed by
 * Pacific wall-clock day ("YYYY-MM-DD" keys) so server and client agree on what
 * "today" means regardless of the runtime's local zone.
 */

export const PAYMENTS_TIME_ZONE = "America/Los_Angeles";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PAYMENTS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PAYMENTS_TIME_ZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** Pacific calendar day for an instant, e.g. "2026-10-29". */
export function pacificDayKey(at: Date | string): string {
  return dayKeyFormatter.format(new Date(at));
}

/** Pacific hour of day, 0–23. */
export function pacificHour(at: Date | string): number {
  const part = hourFormatter.formatToParts(new Date(at)).find((p) => p.type === "hour");
  return Number(part?.value ?? 0) % 24;
}

/** Shift a day key by whole days (negative = earlier). */
export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/** "Oct 29" for a day key. */
export function formatDayKey(dayKey: string, withYear = false): string {
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/** "Oct 2026" for a "YYYY-MM" month key. */
export function formatMonthKey(monthKey: string): string {
  return new Date(`${monthKey}-15T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  });
}
