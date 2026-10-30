import type { DashboardPaymentRow, DashboardPaymentStatus, DashboardPayments } from "@/lib/dashboard-db";
import { addDays, pacificDayKey, pacificHour } from "@/lib/payments-time";

/** Local `next dev` only. Set PAYMENTS_DUMMY=0 to use live bookings and Stripe. */
export function paymentsSampleEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.PAYMENTS_DUMMY !== "0";
}

/** UTC instant for a Pacific wall-clock hour on a day key. */
function atPacific(dayKey: string, hour: number, minute = 0): string {
  const noonUtc = new Date(`${dayKey}T12:00:00Z`);
  const deltaHours = hour - pacificHour(noonUtc);
  return new Date(noonUtc.getTime() + deltaHours * 3_600_000 + minute * 60_000).toISOString();
}

interface Seed {
  daysAgo: number;
  hour: number;
  minute?: number;
  status: DashboardPaymentStatus;
  classType: "initial" | "renewal" | "add_a_gun";
  cents: number;
  student: string;
  /** Class date relative to today. Positive = upcoming. */
  classInDays: number;
  refundedCents?: number;
}

const SEEDS: Seed[] = [
  { daysAgo: 0, hour: 8, status: "PAID", classType: "initial", cents: 25000, student: "Maya Chen", classInDays: 12 },
  { daysAgo: 0, hour: 9, minute: 20, status: "PAID", classType: "renewal", cents: 15000, student: "Andre Williams", classInDays: 6 },
  { daysAgo: 0, hour: 11, status: "PAID", classType: "add_a_gun", cents: 7500, student: "Priya Shah", classInDays: 4 },
  { daysAgo: 0, hour: 13, status: "PAID", classType: "initial", cents: 27500, student: "Luis Ortega", classInDays: 18 },
  { daysAgo: 0, hour: 15, status: "PENDING", classType: "renewal", cents: 17500, student: "Hannah Brooks", classInDays: 9 },
  { daysAgo: 1, hour: 10, status: "PAID", classType: "initial", cents: 25000, student: "Jonah Park", classInDays: 8 },
  { daysAgo: 1, hour: 14, status: "PAID", classType: "renewal", cents: 15000, student: "Elena Vasquez", classInDays: 3 },
  { daysAgo: 1, hour: 16, status: "REFUNDED", classType: "initial", cents: 30000, student: "Chris Dalton", classInDays: -2, refundedCents: 30000 },
  { daysAgo: 2, hour: 11, status: "PAID", classType: "add_a_gun", cents: 5000, student: "Nina Patel", classInDays: 11 },
  { daysAgo: 3, hour: 9, status: "PAID", classType: "renewal", cents: 17500, student: "Owen Blake", classInDays: 2 },
  { daysAgo: 4, hour: 13, status: "CANCELLED", classType: "initial", cents: 25000, student: "Sofia Nguyen", classInDays: 1 },
  { daysAgo: 6, hour: 10, status: "PAID", classType: "initial", cents: 27500, student: "Marcus Hale", classInDays: -1 },
  { daysAgo: 6, hour: 15, status: "REFUNDED", classType: "renewal", cents: 15000, student: "Ava Kim", classInDays: 5, refundedCents: 7500 },
  { daysAgo: 10, hour: 12, status: "PAID", classType: "add_a_gun", cents: 7500, student: "Diego Ramos", classInDays: -3 },
  { daysAgo: 16, hour: 11, status: "PAID", classType: "initial", cents: 25000, student: "Rachel Stein", classInDays: -9 },
  { daysAgo: 22, hour: 14, status: "PAID", classType: "renewal", cents: 15000, student: "Ben Ito", classInDays: -14 },
  { daysAgo: 35, hour: 10, status: "PAID", classType: "initial", cents: 30000, student: "Grace Okonkwo", classInDays: -28 },
  { daysAgo: 48, hour: 13, status: "REFUNDED", classType: "add_a_gun", cents: 7500, student: "Tom Bradley", classInDays: -40, refundedCents: 7500 },
  { daysAgo: 70, hour: 9, status: "PAID", classType: "renewal", cents: 17500, student: "Lila Fernandez", classInDays: -60 },
  { daysAgo: 110, hour: 11, status: "PAID", classType: "initial", cents: 25000, student: "Samir Haddad", classInDays: -100 },
  { daysAgo: 160, hour: 15, status: "PAID", classType: "renewal", cents: 15000, student: "Nora Ellis", classInDays: -150 },
  { daysAgo: 220, hour: 10, status: "PAID", classType: "add_a_gun", cents: 5000, student: "Victor Lang", classInDays: -200 },
  { daysAgo: 300, hour: 12, status: "PAID", classType: "initial", cents: 27500, student: "Irene Cho", classInDays: -280 },
  { daysAgo: 400, hour: 11, status: "PAID", classType: "renewal", cents: 15000, student: "Paul Griffin", classInDays: -390 },
];

export function buildSamplePayments(now = new Date()): DashboardPayments {
  const todayKey = pacificDayKey(now);
  const hourNow = pacificHour(now);

  const payments: DashboardPaymentRow[] = SEEDS.filter((seed) => seed.daysAgo > 0 || seed.hour <= hourNow).map(
    (seed, index) => {
      const paidDay = addDays(todayKey, -seed.daysAgo);
      const paidAt = atPacific(paidDay, seed.hour, seed.minute ?? 0);
      const classDay = addDays(todayKey, seed.classInDays);
      const refunded = seed.status === "REFUNDED";
      return {
        id: `sample-${index + 1}`,
        status: seed.status,
        createdAt: paidAt,
        paidAt: seed.status === "PENDING" ? null : paidAt,
        classStartsAt: atPacific(classDay, 9),
        classType: seed.classType,
        classTitle: null,
        studentName: seed.student,
        classAmountCents: seed.cents,
        refundedClassCents: refunded ? (seed.refundedCents ?? seed.cents) : 0,
        refundedAt: refunded ? paidAt : null,
      };
    }
  );

  const hourlyCents = Array.from({ length: 24 }, () => 0);
  let todayCents = 0;
  let yesterdayCents = 0;
  const yesterdayKey = addDays(todayKey, -1);
  for (const row of payments) {
    if (!row.paidAt || row.status === "PENDING") continue;
    const key = pacificDayKey(row.paidAt);
    if (key === todayKey) {
      todayCents += row.classAmountCents;
      hourlyCents[pacificHour(row.paidAt)] += row.classAmountCents;
    } else if (key === yesterdayKey) {
      yesterdayCents += row.classAmountCents;
    }
  }

  return {
    connected: true,
    fetchedAt: now.toISOString(),
    today: { dayKey: todayKey, tuitionCents: todayCents, hourlyCents },
    yesterday: { tuitionCents: yesterdayCents },
    balance: { availableCents: 184250, pendingCents: 42500 },
    refundsEstimated: false,
    truncated: false,
    payments,
    sample: true,
  };
}

export function buildSamplePayouts(now = new Date()) {
  const todayKey = pacificDayKey(now);
  const rows: { daysAgo: number; amountCents: number; status: string }[] = [
    { daysAgo: 2, amountCents: 84200, status: "paid" },
    { daysAgo: 9, amountCents: 110500, status: "paid" },
    { daysAgo: 16, amountCents: 42750, status: "in_transit" },
    { daysAgo: 23, amountCents: 96500, status: "paid" },
    { daysAgo: 37, amountCents: 15000, status: "failed" },
    { daysAgo: 44, amountCents: 73000, status: "paid" },
  ];
  return rows.map((row, index) => ({
    id: `sample-payout-${index + 1}`,
    amountCents: row.amountCents,
    currency: "usd",
    status: row.status,
    arrivalDate: atPacific(addDays(todayKey, -row.daysAgo), 6),
  }));
}
