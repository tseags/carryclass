import type { DashboardPaymentRow } from "@/lib/dashboard-db";
import { CLASS_TYPES } from "@/components/onboarding/Step2ClassTypes";
import {
  addDays,
  formatDayKey,
  formatMonthKey,
  pacificDayKey,
  pacificHour,
} from "@/lib/payments-time";

export type RangeId = "today" | "7d" | "4w" | "3m" | "12m";
export type BucketId = "hourly" | "daily" | "weekly" | "monthly";

export const RANGES: { id: RangeId; label: string; days: number; buckets: BucketId[] }[] = [
  { id: "today", label: "Today", days: 1, buckets: ["hourly"] },
  { id: "7d", label: "Last 7 days", days: 7, buckets: ["daily", "weekly"] },
  { id: "4w", label: "Last 4 weeks", days: 28, buckets: ["daily", "weekly"] },
  { id: "3m", label: "Last 3 months", days: 91, buckets: ["daily", "weekly", "monthly"] },
  { id: "12m", label: "Last 12 months", days: 365, buckets: ["weekly", "monthly"] },
];

export const DEFAULT_BUCKET: Record<RangeId, BucketId> = {
  today: "hourly",
  "7d": "daily",
  "4w": "daily",
  "3m": "weekly",
  "12m": "monthly",
};

export const BUCKET_LABELS: Record<BucketId, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const CLASS_TYPE_OPTIONS = CLASS_TYPES.map((ct) => ({ key: ct.key, label: ct.label }));

export function classTypeLabel(key: string | null): string {
  if (!key) return "Other";
  return CLASS_TYPE_OPTIONS.find((ct) => ct.key === key)?.label ?? key;
}

/** A booking plus the Pacific day/hour of its ledger date (paid, else created). */
export interface PaymentFact extends DashboardPaymentRow {
  dayKey: string;
  hour: number;
  /** Money actually changed hands (PENDING checkouts never count as revenue). */
  collected: boolean;
}

export function toFacts(rows: DashboardPaymentRow[]): PaymentFact[] {
  return rows.map((row) => {
    const at = row.paidAt ?? row.createdAt;
    return {
      ...row,
      dayKey: pacificDayKey(at),
      hour: pacificHour(at),
      collected: Boolean(row.paidAt) && row.status !== "PENDING",
    };
  });
}

export interface DayWindow {
  startKey: string;
  endKey: string;
}

export function rangeWindows(range: RangeId, todayKey: string): { current: DayWindow; previous: DayWindow } {
  const days = RANGES.find((r) => r.id === range)!.days;
  const currentStart = addDays(todayKey, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  return {
    current: { startKey: currentStart, endKey: todayKey },
    previous: { startKey: addDays(previousEnd, -(days - 1)), endKey: previousEnd },
  };
}

export function inWindow(fact: PaymentFact, w: DayWindow): boolean {
  return fact.dayKey >= w.startKey && fact.dayKey <= w.endKey;
}

export interface Bucket {
  label: string;
  match: (fact: PaymentFact) => boolean;
}

function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:00 ${suffix}`;
}

export function buildBuckets(w: DayWindow, bucket: BucketId): Bucket[] {
  if (bucket === "hourly") {
    return Array.from({ length: 24 }, (_, h) => ({
      label: hourLabel(h),
      match: (f) => f.dayKey === w.startKey && f.hour === h,
    }));
  }

  if (bucket === "monthly") {
    const months: string[] = [];
    for (let k = w.startKey; k <= w.endKey; k = addDays(k, 1)) {
      const m = k.slice(0, 7);
      if (months[months.length - 1] !== m) months.push(m);
    }
    return months.map((m) => ({
      label: formatMonthKey(m),
      match: (f) => f.dayKey.slice(0, 7) === m && inWindow(f, w),
    }));
  }

  const step = bucket === "weekly" ? 7 : 1;
  const buckets: Bucket[] = [];
  for (let start = w.startKey; start <= w.endKey; start = addDays(start, step)) {
    const end = step === 1 ? start : minKey(addDays(start, step - 1), w.endKey);
    buckets.push({
      label: step === 1 ? formatDayKey(start) : `${formatDayKey(start)} – ${formatDayKey(end)}`,
      match: (f) => f.dayKey >= start && f.dayKey <= end,
    });
  }
  return buckets;
}

function minKey(a: string, b: string): string {
  return a < b ? a : b;
}

export interface WindowTotals {
  paymentCount: number;
  grossCents: number;
  refundCents: number;
  refundCount: number;
  netCents: number;
  byType: { key: string; label: string; cents: number; count: number }[];
}

export function windowTotals(facts: PaymentFact[], w: DayWindow): WindowTotals {
  const byType = new Map<string, { cents: number; count: number }>(
    CLASS_TYPE_OPTIONS.map((ct) => [ct.key, { cents: 0, count: 0 }])
  );
  let paymentCount = 0;
  let grossCents = 0;
  let refundCents = 0;
  let refundCount = 0;

  for (const f of facts) {
    if (!f.collected || !inWindow(f, w)) continue;
    paymentCount += 1;
    grossCents += f.classAmountCents;
    if (f.status === "REFUNDED") {
      refundCount += 1;
      refundCents += f.refundedClassCents;
    }
    const key = f.classType ?? "other";
    const entry = byType.get(key) ?? { cents: 0, count: 0 };
    entry.cents += f.classAmountCents;
    entry.count += 1;
    byType.set(key, entry);
  }

  return {
    paymentCount,
    grossCents,
    refundCents,
    refundCount,
    netCents: grossCents - refundCents,
    byType: [...byType.entries()].map(([key, v]) => ({ key, label: classTypeLabel(key), ...v })),
  };
}

export interface SeriesPoint {
  label: string;
  count: number;
  grossCents: number;
}

export function series(facts: PaymentFact[], buckets: Bucket[]): SeriesPoint[] {
  const collected = facts.filter((f) => f.collected);
  return buckets.map((b) => {
    let count = 0;
    let grossCents = 0;
    for (const f of collected) {
      if (!b.match(f)) continue;
      count += 1;
      grossCents += f.classAmountCents;
    }
    return { label: b.label, count, grossCents };
  });
}

export function upcomingPaid(facts: PaymentFact[], now: Date): { cents: number; seats: number } {
  let cents = 0;
  let seats = 0;
  for (const f of facts) {
    if (isUpcomingPaid(f, now)) {
      cents += f.classAmountCents;
      seats += 1;
    }
  }
  return { cents, seats };
}

export function isUpcomingPaid(f: DashboardPaymentRow, now: Date): boolean {
  return (
    f.status === "PAID" &&
    Boolean(f.classStartsAt) &&
    new Date(f.classStartsAt!).getTime() > now.getTime()
  );
}

/** Running total for the Today sparkline. */
export function cumulative(values: number[]): number[] {
  let sum = 0;
  return values.map((v) => (sum += v));
}
