/**
 * Server-only data helpers for the instructor dashboard.
 *
 * Registrations and reviews live in Prisma (Postgres) keyed by the Prisma
 * `Vendor.id`, while the onboarding/profile data lives in Supabase keyed by a
 * separate vendor row. The two are linked by a shared `slug`. Every helper here
 * takes the Supabase vendor's slug, resolves the matching Prisma vendor, and
 * falls back to empty/zero state when no Prisma vendor exists yet (e.g. a newly
 * published instructor who has not received any bookings or reviews).
 *
 * Never import this module from a client component.
 */
import { countySlugFromClassLocation } from "@/data/counties";
import { prisma } from "@/lib/db";
import { addDays, pacificDayKey, pacificHour } from "@/lib/payments-time";
import { isPrismaConnectionError } from "@/lib/prisma-connection-error";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface DashboardReview {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
  classDate: string | null;
}

export interface DashboardRegistration {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  classTitle: string | null;
  classType: string | null;
  classDate: string | null;
  registeredOn: string;
  status: string;
  paidAt: string | null;
  classSessionId: string | null;
  /** Calendar location when a session can be joined by start time. */
  location: string | null;
  /**
   * Canonical county slug when location text uniquely names a CA county.
   * Null when unknown or ambiguous — never inferred from vendor counties_served.
   */
  countySlug: string | null;
}

export interface DashboardStats {
  totalRegistrations: number;
  registrationsThisMonth: number;
  totalReviews: number;
}

export interface DashboardPayout {
  connected: boolean;
  lastAmountCents: number | null;
  lastPayoutDate: string | null;
}

export type DashboardPaymentStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";

/** One booking as seen by the Payments tab. Money is class tuition only (no platform fee). */
export interface DashboardPaymentRow {
  id: string;
  status: DashboardPaymentStatus;
  createdAt: string;
  paidAt: string | null;
  classStartsAt: string | null;
  classType: string | null;
  classTitle: string | null;
  studentName: string;
  classAmountCents: number;
  /** Refunded tuition, capped at `classAmountCents` (the service fee is non-refundable). */
  refundedClassCents: number;
  refundedAt: string | null;
}

export interface DashboardPayments {
  connected: boolean;
  fetchedAt: string;
  today: { dayKey: string; tuitionCents: number; hourlyCents: number[] };
  yesterday: { tuitionCents: number };
  /** Null when Stripe is disconnected or the balance lookup failed. */
  balance: { availableCents: number; pendingCents: number } | null;
  /** True when at least one refund amount fell back to full tuition. */
  refundsEstimated: boolean;
  /** True when the row cap was hit and older history was dropped. */
  truncated: boolean;
  payments: DashboardPaymentRow[];
  /** Local preview only. These rows are not real bookings. */
  sample?: boolean;
}

/** Per-template-type send counts, keyed by template_type (e.g. "confirmation"). */
export interface EmailTypeMetrics {
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
}

export interface DashboardEmailMetrics {
  /** Total emails actually sent (test sends are recorded too). */
  sent: number;
  /** Confirmed delivered — requires Resend webhooks (not wired yet, so 0). */
  delivered: number;
  /** Opens — requires Resend open-tracking webhooks (not wired yet, so 0). */
  opened: number;
  /** Sends that failed. */
  failed: number;
  /** Whether delivered/opened tracking is actually wired (Resend webhook). */
  openTrackingEnabled: boolean;
  /** Per-email-type breakdown of the same counts above. */
  byType: Record<string, EmailTypeMetrics>;
}

/** Resolve the Prisma vendor id for a given slug. Returns null if not found. */
async function resolvePrismaVendorId(slug: string | null): Promise<string | null> {
  if (!slug?.trim()) return null;
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug },
      select: { id: true },
    });
    return vendor?.id ?? null;
  } catch (error) {
    if (isPrismaConnectionError(error)) return null;
    // Table-missing or other transient errors should degrade gracefully.
    console.error("[dashboard-db] resolvePrismaVendorId", error);
    return null;
  }
}

/** Approved reviews for the instructor, newest first. */
export async function getDashboardReviews(slug: string | null): Promise<DashboardReview[]> {
  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return [];

  try {
    const rows = await prisma.vendorReview.findMany({
      where: { vendorId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorName: true,
        rating: true,
        body: true,
        createdAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      authorName: row.authorName,
      rating: row.rating,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      // TODO: VendorReview has no attended-class link yet; surface once available.
      classDate: null,
    }));
  } catch (error) {
    if (isPrismaConnectionError(error)) return [];
    console.error("[dashboard-db] getDashboardReviews", error);
    return [];
  }
}

/** Bookings for the instructor, newest first. No silent cap — instructors need the full roster. */
export async function getDashboardRegistrations(
  slug: string | null
): Promise<DashboardRegistration[]> {
  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return [];

  try {
    const rows = await prisma.booking.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        status: true,
        paidAt: true,
        createdAt: true,
        classSessionId: true,
        classSession: { select: { startsAt: true, title: true, classType: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      classTitle: row.classSession?.title ?? null,
      classType: row.classSession?.classType ?? null,
      classDate: row.classSession?.startsAt?.toISOString() ?? null,
      registeredOn: row.createdAt.toISOString(),
      status: row.status,
      paidAt: row.paidAt?.toISOString() ?? null,
      classSessionId: row.classSessionId,
      location: null,
      countySlug: null,
    }));
  } catch (error) {
    if (isPrismaConnectionError(error)) return [];
    console.error("[dashboard-db] getDashboardRegistrations", error);
    return [];
  }
}

type CalendarJoinRow = {
  start_time: string;
  title: string | null;
  location: string | null;
  range_location: string | null;
};

/**
 * Join Supabase calendar classes onto Prisma bookings by start-minute (and title
 * when several events share a minute). County is set only when location text
 * uniquely names a California county.
 */
export function attachCalendarToRegistrations(
  registrations: DashboardRegistration[],
  calendarClasses: CalendarJoinRow[]
): DashboardRegistration[] {
  if (registrations.length === 0 || calendarClasses.length === 0) return registrations;

  const byMinute = new Map<number, CalendarJoinRow[]>();
  for (const cls of calendarClasses) {
    const minute = classStartMinute(cls.start_time);
    const list = byMinute.get(minute);
    if (list) list.push(cls);
    else byMinute.set(minute, [cls]);
  }

  return registrations.map((row) => {
    if (!row.classDate) return row;
    const candidates = byMinute.get(classStartMinute(row.classDate));
    if (!candidates?.length) return row;

    const title = row.classTitle?.trim().toLowerCase() ?? "";
    const match =
      (title
        ? candidates.find((c) => (c.title?.trim().toLowerCase() ?? "") === title)
        : undefined) ?? candidates[0];

    const location = match.location?.trim() || match.range_location?.trim() || null;
    const fromLocation = countySlugFromClassLocation(match.location);
    const fromRange = countySlugFromClassLocation(match.range_location);
    let countySlug: string | null = null;
    if (fromLocation && fromRange && fromLocation !== fromRange) {
      countySlug = null;
    } else {
      countySlug = fromLocation ?? fromRange;
    }

    return { ...row, location, countySlug };
  });
}

/** Round a class start to the minute so calendar rows can join Prisma sessions. */
export function classStartMinute(iso: string | Date): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.floor(t / 60_000);
}

/**
 * Paid + pending booking counts keyed by class start minute.
 * Calendar classes (Supabase) and bookable sessions (Prisma) share no id, so
 * the dashboard joins them on start time.
 */
export async function getDashboardRegistrationCountsByStartMinute(
  slug: string | null
): Promise<Record<number, number>> {
  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return {};

  try {
    const groups = await prisma.booking.groupBy({
      by: ["classSessionId"],
      where: { vendorId, status: { in: ["PAID", "PENDING"] } },
      _count: { _all: true },
    });
    if (groups.length === 0) return {};

    const sessions = await prisma.classSession.findMany({
      where: { id: { in: groups.map((g) => g.classSessionId) } },
      select: { id: true, startsAt: true },
    });
    const sessionMinute = new Map(sessions.map((s) => [s.id, classStartMinute(s.startsAt)]));

    const counts: Record<number, number> = {};
    for (const group of groups) {
      const minute = sessionMinute.get(group.classSessionId);
      if (minute == null) continue;
      counts[minute] = (counts[minute] ?? 0) + group._count._all;
    }
    return counts;
  } catch (error) {
    if (isPrismaConnectionError(error)) return {};
    console.error("[dashboard-db] getDashboardRegistrationCountsByStartMinute", error);
    return {};
  }
}

/** Registration + review counts for the stats row. */
export async function getDashboardStats(slug: string | null): Promise<DashboardStats> {
  const empty: DashboardStats = {
    totalRegistrations: 0,
    registrationsThisMonth: 0,
    totalReviews: 0,
  };

  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return empty;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [totalRegistrations, registrationsThisMonth, totalReviews] = await Promise.all([
      prisma.booking.count({ where: { vendorId } }),
      prisma.booking.count({
        where: { vendorId, createdAt: { gte: startOfMonth } },
      }),
      prisma.vendorReview.count({ where: { vendorId, status: "APPROVED" } }),
    ]);

    return { totalRegistrations, registrationsThisMonth, totalReviews };
  } catch (error) {
    if (isPrismaConnectionError(error)) return empty;
    console.error("[dashboard-db] getDashboardStats", error);
    return empty;
  }
}

/**
 * Email metrics for the Emails-tab summary, sourced from the vendor_email_events
 * log in Supabase (keyed by the Supabase vendor id, NOT the slug).
 *
 * `delivered` and `opened` require Resend delivery/open webhooks to populate the
 * log — that integration is NOT wired yet, so those counts are honestly 0 and
 * `openTrackingEnabled` is false so the UI can label them as not-yet-tracked.
 */
export async function getEmailMetrics(vendorId: string): Promise<DashboardEmailMetrics> {
  const empty: DashboardEmailMetrics = {
    sent: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    openTrackingEnabled: false,
    byType: {},
  };

  if (!vendorId?.trim()) return empty;

  try {
    const { data, error } = await supabaseAdmin()
      .from("vendor_email_events")
      .select("status, template_type")
      .eq("vendor_id", vendorId);

    if (error || !data) return empty;

    const rows = data as { status: string | null; template_type: string | null }[];
    const tally = (subset: { status: string | null }[]): EmailTypeMetrics => {
      const count = (predicate: (s: string) => boolean) =>
        subset.filter((r) => predicate((r.status ?? "").toLowerCase())).length;
      return {
        // A delivered/opened email was, by definition, also sent.
        sent: count((s) => s === "sent" || s === "delivered" || s === "opened"),
        delivered: count((s) => s === "delivered"),
        opened: count((s) => s === "opened"),
        failed: count((s) => s === "failed"),
      };
    };

    const grouped: Record<string, { status: string | null }[]> = {};
    for (const row of rows) {
      const key = row.template_type;
      if (!key) continue;
      (grouped[key] ??= []).push(row);
    }
    const typeBreakdown: Record<string, EmailTypeMetrics> = {};
    for (const [key, subset] of Object.entries(grouped)) {
      typeBreakdown[key] = tally(subset);
    }

    return {
      ...tally(rows),
      openTrackingEnabled: false,
      byType: typeBreakdown,
    };
  } catch (error) {
    console.error("[dashboard-db] getEmailMetrics", error);
    return empty;
  }
}

/** Most recent payout for the connected Stripe account (Overview payments card). */
export async function getDashboardPayout(
  stripeAccountId: string | null
): Promise<DashboardPayout> {
  if (!stripeAccountId?.trim()) {
    return { connected: false, lastAmountCents: null, lastPayoutDate: null };
  }

  try {
    const payouts = await getStripe().payouts.list(
      { limit: 1 },
      { stripeAccount: stripeAccountId }
    );
    const last = payouts.data[0];
    return {
      connected: true,
      lastAmountCents: last?.amount ?? null,
      lastPayoutDate: last ? new Date(last.arrival_date * 1000).toISOString() : null,
    };
  } catch (error) {
    console.error("[dashboard-db] getDashboardPayout", error);
    // Account is connected but payout lookup failed — still report connected.
    return { connected: true, lastAmountCents: null, lastPayoutDate: null };
  }
}

/** 24 months so the 12-month range can compare against the previous 12. */
const PAYMENTS_HISTORY_DAYS = 731;
const PAYMENTS_ROW_CAP = 5000;
const REFUND_LOOKUP_CAP = 200;
const REFUND_LOOKUP_CONCURRENCY = 8;

const PAYMENT_STATUSES = new Set<DashboardPaymentStatus>(["PENDING", "PAID", "CANCELLED", "REFUNDED"]);

/**
 * Booking ledger + Stripe balance for the Payments tab.
 *
 * Checkout uses destination charges, so PaymentIntents and their refunds live on
 * the platform account; only balance and payouts are read from the connected
 * account. Stripe failures degrade to estimates instead of failing the page.
 */
export async function getDashboardPayments(
  slug: string | null,
  stripeAccountId: string | null
): Promise<DashboardPayments> {
  const now = new Date();
  const connected = Boolean(stripeAccountId?.trim());
  const [rows, balance] = await Promise.all([
    loadPaymentRows(slug, now),
    connected ? loadConnectedBalance(stripeAccountId!) : Promise.resolve(null),
  ]);

  const { payments, refundsEstimated } = await attachRefunds(rows.payments);

  const todayKey = pacificDayKey(now);
  const yesterdayKey = addDays(todayKey, -1);
  const hourlyCents = Array.from({ length: 24 }, () => 0);
  let todayCents = 0;
  let yesterdayCents = 0;
  for (const p of payments) {
    if (!p.paidAt || p.status === "PENDING") continue;
    const key = pacificDayKey(p.paidAt);
    if (key === todayKey) {
      todayCents += p.classAmountCents;
      hourlyCents[pacificHour(p.paidAt)] += p.classAmountCents;
    } else if (key === yesterdayKey) {
      yesterdayCents += p.classAmountCents;
    }
  }

  return {
    connected,
    fetchedAt: now.toISOString(),
    today: { dayKey: todayKey, tuitionCents: todayCents, hourlyCents },
    yesterday: { tuitionCents: yesterdayCents },
    balance,
    refundsEstimated,
    truncated: rows.truncated,
    payments,
  };
}

async function loadPaymentRows(
  slug: string | null,
  now: Date
): Promise<{ payments: RowWithIntent[]; truncated: boolean }> {
  const vendorId = await resolvePrismaVendorId(slug);
  if (!vendorId) return { payments: [], truncated: false };

  const since = new Date(now.getTime() - PAYMENTS_HISTORY_DAYS * 86_400_000);
  try {
    const rows = await prisma.booking.findMany({
      where: {
        vendorId,
        OR: [
          { createdAt: { gte: since } },
          { status: "PAID", classSession: { startsAt: { gt: now } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: PAYMENTS_ROW_CAP + 1,
      select: {
        id: true,
        status: true,
        createdAt: true,
        paidAt: true,
        customerName: true,
        classAmountCents: true,
        stripePaymentIntentId: true,
        classSession: { select: { startsAt: true, title: true, classType: true } },
      },
    });

    const truncated = rows.length > PAYMENTS_ROW_CAP;
    const payments = rows.slice(0, PAYMENTS_ROW_CAP).map((row): RowWithIntent => {
      const status = PAYMENT_STATUSES.has(row.status as DashboardPaymentStatus)
        ? (row.status as DashboardPaymentStatus)
        : "PENDING";
      return {
        id: row.id,
        status,
        createdAt: row.createdAt.toISOString(),
        paidAt: row.paidAt?.toISOString() ?? null,
        classStartsAt: row.classSession?.startsAt?.toISOString() ?? null,
        classType: row.classSession?.classType?.trim().toLowerCase() || null,
        classTitle: row.classSession?.title ?? null,
        studentName: row.customerName?.trim() || "Student",
        classAmountCents: row.classAmountCents,
        refundedClassCents: 0,
        refundedAt: null,
        paymentIntentId: row.stripePaymentIntentId,
      };
    });
    return { payments, truncated };
  } catch (error) {
    if (isPrismaConnectionError(error)) return { payments: [], truncated: false };
    console.error("[dashboard-db] loadPaymentRows", error);
    return { payments: [], truncated: false };
  }
}

async function loadConnectedBalance(
  stripeAccountId: string
): Promise<DashboardPayments["balance"]> {
  try {
    const balance = await getStripe().balance.retrieve({}, { stripeAccount: stripeAccountId });
    const sumUsd = (entries: { amount: number; currency: string }[]) =>
      entries.filter((e) => e.currency === "usd").reduce((sum, e) => sum + e.amount, 0);
    return { availableCents: sumUsd(balance.available), pendingCents: sumUsd(balance.pending) };
  } catch (error) {
    console.error("[dashboard-db] loadConnectedBalance", error);
    return null;
  }
}

type RowWithIntent = DashboardPaymentRow & { paymentIntentId: string | null };

async function attachRefunds(
  rows: RowWithIntent[]
): Promise<{ payments: DashboardPaymentRow[]; refundsEstimated: boolean }> {
  let refundsEstimated = false;
  const refunded = rows.filter((r) => r.status === "REFUNDED");
  const lookups = refunded.filter((r) => r.paymentIntentId).slice(0, REFUND_LOOKUP_CAP);
  const results = new Map<string, { cents: number; at: string | null }>();

  let stripe: ReturnType<typeof getStripe> | null = null;
  try {
    if (lookups.length > 0) stripe = getStripe();
  } catch (error) {
    console.error("[dashboard-db] attachRefunds", error);
  }

  if (stripe) {
    for (let i = 0; i < lookups.length; i += REFUND_LOOKUP_CONCURRENCY) {
      const batch = lookups.slice(i, i + REFUND_LOOKUP_CONCURRENCY);
      await Promise.all(
        batch.map(async (row) => {
          try {
            const list = await stripe!.refunds.list({
              payment_intent: row.paymentIntentId!,
              limit: 20,
            });
            const counted = list.data.filter(
              (r) => r.status === "succeeded" || r.status === "pending"
            );
            const cents = counted.reduce((sum, r) => sum + r.amount, 0);
            const latest = counted.reduce((max, r) => Math.max(max, r.created), 0);
            results.set(row.id, {
              cents,
              at: latest ? new Date(latest * 1000).toISOString() : null,
            });
          } catch (error) {
            console.error("[dashboard-db] refunds.list", row.id, error);
          }
        })
      );
    }
  }

  const payments = rows.map((withIntent): DashboardPaymentRow => {
    const { paymentIntentId, ...row } = withIntent;
    if (row.status !== "REFUNDED" || !paymentIntentId) {
      if (row.status === "REFUNDED") {
        refundsEstimated = true;
        return { ...row, refundedClassCents: row.classAmountCents };
      }
      return row;
    }
    const found = results.get(row.id);
    if (!found || found.cents === 0) {
      refundsEstimated = true;
      return { ...row, refundedClassCents: row.classAmountCents };
    }
    return {
      ...row,
      refundedClassCents: Math.min(found.cents, row.classAmountCents),
      refundedAt: found.at,
    };
  });

  return { payments, refundsEstimated };
}
