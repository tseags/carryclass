"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardPayout, DashboardPayments } from "@/lib/dashboard-db";
import { pacificHour } from "@/lib/payments-time";
import { STRIPE_CONNECT_HREF } from "../ConnectStripePrompt";
import { formatCurrency, formatLongDate, formatTime } from "../dashboard-format";
import {
  DASH_BORDER,
  DASH_BTN_PRIMARY,
  DASH_BTN_SECONDARY,
  DASH_CARD,
  DASH_CARD_TITLE,
  DASH_DIVIDE,
  DASH_INK,
  DASH_LINK,
  DASH_MUTED,
  DASH_PAGE_TITLE,
  DASH_SUBSECTION_TITLE,
  DASH_TABLE_HEAD,
} from "../dashboard-theme";
import { LineChart, NoData } from "./PaymentsCharts";
import {
  DEFAULT_LEDGER_FILTERS,
  PaymentsLedger,
  segmentClass,
  type LedgerFilters,
} from "./PaymentsLedger";
import {
  BUCKET_LABELS,
  DEFAULT_BUCKET,
  RANGES,
  buildBuckets,
  cumulative,
  rangeWindows,
  series,
  toFacts,
  upcomingPaid,
  windowTotals,
  type BucketId,
  type RangeId,
} from "./payments-metrics";

interface Payout {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  arrivalDate: string;
}

type PayoutsState =
  | { status: "loading" }
  | { status: "ready"; payouts: Payout[] }
  | { status: "error"; message: string };

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  in_transit: "In transit",
  canceled: "Canceled",
  failed: "Failed",
};

function scrollToId(id: string) {
  requestAnimationFrame(() =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  );
}

export function PaymentsDashboard({
  stripeAccountId,
  fallbackPayout,
  connectionPanel,
  focusPayouts,
  onFocusHandled,
  checkoutFees = [],
  onEditFees,
}: {
  stripeAccountId: string | null;
  fallbackPayout: DashboardPayout;
  /** Existing Stripe connect / switch / disconnect block, rendered under payouts. */
  connectionPanel: React.ReactNode;
  focusPayouts?: boolean;
  onFocusHandled?: () => void;
  checkoutFees?: { name: string; amount: number; is_active: boolean }[];
  onEditFees?: () => void;
}) {
  const connected = Boolean(stripeAccountId);
  const [data, setData] = useState<DashboardPayments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutsState>({ status: "loading" });
  const [range, setRange] = useState<RangeId>("7d");
  const [bucket, setBucket] = useState<BucketId>(DEFAULT_BUCKET["7d"]);
  const [compare, setCompare] = useState(true);
  const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_LEDGER_FILTERS);
  const [showPending, setShowPending] = useState(false);
  const requestId = useRef(0);
  const sample = Boolean(data?.sample);
  /** Sample mode fills balance and payouts even when Stripe is not connected. */
  const showStripe = connected || sample;

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/payments", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as DashboardPayments & { error?: string };
      if (id !== requestId.current) return;
      if (!res.ok) {
        setError(body.error ?? "Could not load payments.");
        return;
      }
      setData(body);
    } catch {
      if (id === requestId.current) setError("Could not load payments.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    setPayouts({ status: "loading" });
    try {
      const res = await fetch("/api/dashboard/payouts", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { payouts?: Payout[]; error?: string };
      if (!res.ok) {
        setPayouts({ status: "error", message: body.error ?? "Unable to load payout history" });
        return;
      }
      setPayouts({ status: "ready", payouts: body.payouts ?? [] });
    } catch {
      setPayouts({ status: "error", message: "Unable to load payout history" });
    }
  }, []);

  useEffect(() => {
    void load();
    void loadPayouts();
  }, [load, loadPayouts]);

  useEffect(() => {
    if (!focusPayouts || loading) return;
    scrollToId("payouts");
    onFocusHandled?.();
  }, [focusPayouts, loading, onFocusHandled]);

  const now = useMemo(() => (data ? new Date(data.fetchedAt) : new Date()), [data]);
  const facts = useMemo(() => toFacts(data?.payments ?? []), [data]);
  const todayKey = data?.today.dayKey ?? "";
  const windows = useMemo(() => rangeWindows(range, todayKey || "1970-01-01"), [range, todayKey]);
  const current = useMemo(() => windowTotals(facts, windows.current), [facts, windows]);
  const previous = useMemo(() => windowTotals(facts, windows.previous), [facts, windows]);
  const currentSeries = useMemo(
    () => series(facts, buildBuckets(windows.current, bucket)),
    [facts, windows, bucket]
  );
  const previousSeries = useMemo(
    () => series(facts, buildBuckets(windows.previous, bucket)),
    [facts, windows, bucket]
  );
  const upcoming = useMemo(() => upcomingPaid(facts, now), [facts, now]);
  const rangeLabel = RANGES.find((r) => r.id === range)!.label;

  function selectRange(next: RangeId) {
    setRange(next);
    setBucket(DEFAULT_BUCKET[next]);
  }

  function showLedger(next: Partial<LedgerFilters>) {
    setFilters({ ...DEFAULT_LEDGER_FILTERS, ...next });
    scrollToId("payments-ledger");
  }

  const latestPayout: Payout | null =
    payouts.status === "ready" && payouts.payouts[0]
      ? payouts.payouts[0]
      : fallbackPayout.lastAmountCents != null && fallbackPayout.lastPayoutDate
        ? {
            id: "fallback",
            amountCents: fallbackPayout.lastAmountCents,
            currency: "usd",
            status: "paid",
            arrivalDate: fallbackPayout.lastPayoutDate,
          }
        : null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className={DASH_PAGE_TITLE}>Payments</h1>
        <div className={`mt-1.5 text-sm ${DASH_MUTED}`}>
          Class revenue, refunds, and payouts from CarryClass bookings. Amounts are class tuition — the
          CarryClass booking fee is never included.
        </div>
      </div>

      <CheckoutFeesCard fees={checkoutFees} onEdit={onEditFees} />

      {sample && (
        <div className="rounded-xl !border border-[#F0DCC8] bg-[#FDF6EE] px-4 py-3 text-sm text-[#6E3510]">
          Sample bookings so you can preview this page on localhost. None of these students, amounts, or
          payouts are real. Set <span className="font-mono">PAYMENTS_DUMMY=0</span> to use live data.
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg !border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md !border border-red-300 !bg-white px-3 py-1 text-sm font-medium text-red-700 hover:!bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Today ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="payments-today">
        <div className={`flex items-center justify-between gap-3 border-b pb-3 ${DASH_BORDER}`}>
          <h2 id="payments-today" className={DASH_SUBSECTION_TITLE}>
            Today
          </h2>
          {connected && (
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`${DASH_BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}
            >
              Manage in Stripe ↗
            </a>
          )}
        </div>

        {loading && !data ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            <div className="h-40 animate-pulse rounded-lg bg-[#F1ECE5] lg:col-span-2" />
            <div className="h-40 animate-pulse rounded-lg bg-[#F1ECE5]" />
          </div>
        ) : (
          <div className="mt-5 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-10">
                <div>
                  <div className="text-xs font-medium text-[#7A7268]">Class revenue</div>
                  <div className="text-xl font-semibold tabular-nums text-[#1F1B16]">
                    {formatCurrency(data?.today.tuitionCents ?? 0)}
                  </div>
                  <div className="text-xs text-[#8A837A]">{formatTime(now.toISOString())}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#7A7268]">Yesterday</div>
                  <div className="text-xl font-semibold tabular-nums text-[#7A7268]">
                    {formatCurrency(data?.yesterday.tuitionCents ?? 0)}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <LineChart
                  values={cumulative(data?.today.hourlyCents ?? Array(24).fill(0))}
                  solidUntil={pacificHour(now)}
                  height={64}
                  ariaLabel={`Class revenue today so far: ${formatCurrency(data?.today.tuitionCents ?? 0)}`}
                />
                <div className="mt-1 flex justify-between text-[11px] text-[#8A837A]">
                  <span>12:00 AM</span>
                  <span>11:59 PM</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#ECE7E0]">
              <div className="pb-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[#7A7268]">Stripe balance</div>
                  {showStripe && data?.balance && (
                    <button
                      type="button"
                      onClick={() => setShowPending((v) => !v)}
                      aria-expanded={showPending}
                      className="!bg-transparent text-xs font-medium text-[#C1440E] hover:underline"
                    >
                      {showPending ? "View less" : "View more"}
                    </button>
                  )}
                </div>
                {!showStripe ? (
                  <ConnectCta text="Connect Stripe to see your balance." />
                ) : data?.balance ? (
                  <>
                    <div className="text-xl font-semibold tabular-nums text-[#1F1B16]">
                      {formatCurrency(data.balance.availableCents)}
                    </div>
                    <div className="text-xs text-[#8A837A]">Available</div>
                    {showPending && (
                      <div className="mt-2 text-sm text-[#3D3730]">
                        <span className="tabular-nums">{formatCurrency(data.balance.pendingCents)}</span>{" "}
                        <span className="text-xs text-[#8A837A]">pending</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-1 text-sm text-[#7A7268]">Balance unavailable right now.</div>
                )}
              </div>
              <div className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[#7A7268]">Latest payout</div>
                  {showStripe && (
                    <button
                      type="button"
                      onClick={() => scrollToId("payouts")}
                      className="!bg-transparent text-xs font-medium text-[#C1440E] hover:underline"
                    >
                      View
                    </button>
                  )}
                </div>
                {!showStripe ? (
                  <ConnectCta text="Payouts start after you connect Stripe." />
                ) : latestPayout ? (
                  <>
                    <div className="text-xl font-semibold tabular-nums text-[#1F1B16]">
                      {formatCurrency(latestPayout.amountCents)}
                    </div>
                    <div className="text-xs text-[#8A837A]">
                      {PAYOUT_STATUS_LABEL[latestPayout.status] ?? latestPayout.status} ·{" "}
                      {formatLongDate(latestPayout.arrivalDate)}
                    </div>
                  </>
                ) : (
                  <div className="text-xl font-semibold text-[#C9C1B6]">—</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Your overview ─────────────────────────────────────────────────── */}
      <section aria-labelledby="payments-overview" className="space-y-4">
        <h2 id="payments-overview" className={DASH_SUBSECTION_TITLE}>
          Your overview
        </h2>
        <div className={`flex flex-wrap items-center gap-3 border-b pb-3 ${DASH_BORDER}`}>
          <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-lg bg-[#F1ECE5] p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => selectRange(r.id)}
                className={segmentClass(range === r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {RANGES.find((r) => r.id === range)!.buckets.length > 1 && (
            <div role="group" aria-label="Group by" className="flex gap-1 rounded-lg bg-[#F1ECE5] p-1">
              {RANGES.find((r) => r.id === range)!.buckets.map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={bucket === b}
                  onClick={() => setBucket(b)}
                  className={segmentClass(bucket === b)}
                >
                  {BUCKET_LABELS[b]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            aria-pressed={compare}
            onClick={() => setCompare((v) => !v)}
            className={`rounded-lg !border px-3 py-1.5 text-xs font-medium transition-colors ${
              compare
                ? "!border-[#C1440E]/40 !bg-[#C1440E]/8 text-[#A93B0C]"
                : "!border-[#E3DDD4] !bg-white text-[#5C554C] hover:text-[#1F1B16]"
            }`}
          >
            {compare ? "✓ " : ""}Compare to previous period
          </button>
        </div>

        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-lg bg-[#F1ECE5]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Payments"
              value={`${current.paymentCount}`}
              previous={compare ? `${previous.paymentCount} previous period` : null}
              updatedAt={now}
              onMore={() => showLedger({})}
            >
              {current.paymentCount === 0 ? (
                <NoData className="h-28" />
              ) : (
                <ChartWithAxis
                  values={currentSeries.map((p) => p.count)}
                  compare={compare ? previousSeries.map((p) => p.count) : null}
                  labels={currentSeries.map((p) => p.label)}
                  ariaLabel={`${current.paymentCount} paid bookings, ${rangeLabel.toLowerCase()}`}
                  fill
                />
              )}
            </MetricCard>

            <MetricCard
              title="Class revenue"
              value={formatCurrency(current.grossCents)}
              previous={compare ? `${formatCurrency(previous.grossCents)} previous period` : null}
              updatedAt={now}
              onMore={() => showLedger({})}
            >
              <ChartWithAxis
                values={currentSeries.map((p) => p.grossCents)}
                compare={compare ? previousSeries.map((p) => p.grossCents) : null}
                labels={currentSeries.map((p) => p.label)}
                ariaLabel={`Class revenue ${formatCurrency(current.grossCents)}, ${rangeLabel.toLowerCase()}`}
              />
            </MetricCard>

            <MetricCard title="By class type" value={formatCurrency(current.grossCents)} updatedAt={now}>
              <ClassTypeBreakdown
                rows={current.byType.filter((t) => t.key !== "other" || t.count > 0)}
                previous={compare ? previous.byType : null}
                total={current.grossCents}
                onSelect={(key) => showLedger({ classType: key })}
              />
            </MetricCard>

            <MetricCard
              title={data?.refundsEstimated ? "Refunds (estimated)" : "Refunds"}
              value={formatCurrency(current.refundCents)}
              subtitle={`${current.refundCount} refunded booking${current.refundCount === 1 ? "" : "s"}`}
              previous={compare ? `${formatCurrency(previous.refundCents)} previous period` : null}
              updatedAt={now}
              onMore={() => showLedger({ status: "REFUNDED" })}
            >
              {current.refundCount === 0 && <NoData className="h-20" />}
            </MetricCard>

            <MetricCard
              title="Net to you"
              value={formatCurrency(current.netCents)}
              subtitle="Class revenue minus refunds"
              previous={compare ? `${formatCurrency(previous.netCents)} previous period` : null}
              updatedAt={now}
              onMore={() => showLedger({})}
            />

            <MetricCard
              title="Upcoming paid classes"
              value={formatCurrency(upcoming.cents)}
              subtitle={`${upcoming.seats} paid seat${upcoming.seats === 1 ? "" : "s"} in upcoming classes`}
              updatedAt={now}
              onMore={() => showLedger({ status: "PAID", upcomingOnly: true })}
            />
          </div>
        )}

        {data?.truncated && (
          <div className="text-xs text-[#7A7268]">
            Showing your most recent 5,000 bookings. Older history is available in Stripe.
          </div>
        )}
      </section>

      {/* ── Ledger ────────────────────────────────────────────────────────── */}
      {data && (
        <PaymentsLedger
          facts={facts}
          dayWindow={windows.current}
          rangeLabel={rangeLabel}
          filters={filters}
          onFiltersChange={setFilters}
          now={now}
        />
      )}

      {/* ── Payouts ───────────────────────────────────────────────────────── */}
      <section id="payouts" className={`scroll-mt-24 ${DASH_CARD} p-5 sm:p-6`}>
        <h2 className={DASH_SUBSECTION_TITLE}>Payouts</h2>
        <div className={`mt-0.5 text-xs ${DASH_MUTED}`}>
          Stripe sends payouts to your bank automatically on your payout schedule.
        </div>
        <PayoutsList connected={showStripe} state={payouts} onRetry={() => void loadPayouts()} />
      </section>

      {connectionPanel}
    </div>
  );
}

function ConnectCta({ text }: { text: string }) {
  return (
    <div className="mt-1 space-y-2">
      <div className="text-sm text-[#5C554C]">{text}</div>
      <a
        href={STRIPE_CONNECT_HREF}
        className={`${DASH_BTN_PRIMARY} !px-3 !py-1.5 !text-xs`}
      >
        Connect Stripe →
      </a>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  previous,
  updatedAt,
  onMore,
  children,
}: {
  title: string;
  value: string;
  subtitle?: string;
  previous?: string | null;
  updatedAt: Date;
  onMore?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex min-h-56 flex-col ${DASH_CARD} p-5`}>
      <div className={`text-sm font-medium ${DASH_INK}`}>{title}</div>
      <div className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${DASH_INK}`}>{value}</div>
      {subtitle && <div className="text-xs text-[#7A7268]">{subtitle}</div>}
      {previous && <div className="text-xs text-[#8A837A]">{previous}</div>}
      <div className="mt-3 flex-1">{children}</div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#8A837A]">
        <span>Updated {formatTime(updatedAt.toISOString())}</span>
        {onMore && (
          <button
            type="button"
            onClick={onMore}
            className={`${DASH_LINK} !text-[11px]`}
          >
            More details
          </button>
        )}
      </div>
    </div>
  );
}

function ChartWithAxis({
  values,
  compare,
  labels,
  ariaLabel,
  fill,
}: {
  values: number[];
  compare: number[] | null;
  labels: string[];
  ariaLabel: string;
  fill?: boolean;
}) {
  return (
    <div>
      <LineChart values={values} compare={compare} height={72} fill={fill} ariaLabel={ariaLabel} />
      <div className="mt-1 flex justify-between gap-2 text-[11px] text-[#8A837A]">
        <span className="truncate">{labels[0]}</span>
        {labels.length > 1 && <span className="truncate text-right">{labels[labels.length - 1]}</span>}
      </div>
    </div>
  );
}

function ClassTypeBreakdown({
  rows,
  previous,
  total,
  onSelect,
}: {
  rows: { key: string; label: string; cents: number; count: number }[];
  previous: { key: string; cents: number }[] | null;
  total: number;
  onSelect: (key: string) => void;
}) {
  return (
    <ul className="!m-0 space-y-3 !p-0">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.cents / total) * 100) : 0;
        const prev = previous?.find((p) => p.key === row.key)?.cents ?? 0;
        return (
          <li key={row.key} className="!m-0 list-none !p-0">
            <button
              type="button"
              onClick={() => onSelect(row.key)}
              className="group block w-full !bg-transparent text-left"
              aria-label={`${row.label}: ${formatCurrency(row.cents)} from ${row.count} booking${row.count === 1 ? "" : "s"}. Show in payments table.`}
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[#3D3730] group-hover:text-[#C1440E]">{row.label}</span>
                <span className="tabular-nums text-[#1F1B16]">{formatCurrency(row.cents)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[#F1ECE5]">
                <div className="h-1.5 rounded-full bg-[#C1440E]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-0.5 flex justify-between text-[11px] text-[#8A837A]">
                <span>
                  {row.count} booking{row.count === 1 ? "" : "s"}
                </span>
                {previous && <span>{formatCurrency(prev)} prev.</span>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PayoutsList({
  connected,
  state,
  onRetry,
}: {
  connected: boolean;
  state: PayoutsState;
  onRetry: () => void;
}) {
  if (!connected) {
    return <ConnectCta text="Connect Stripe to receive payouts for paid bookings." />;
  }
  if (state.status === "loading") {
    return (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-[#F1ECE5]" />
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mt-4 flex items-center gap-3 text-sm text-red-700">
        {state.message}
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md !border border-red-300 !bg-white px-2.5 py-1 text-xs font-medium hover:!bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }
  if (state.payouts.length === 0) {
    return <div className="py-8 text-center text-sm text-[#7A7268]">No payouts yet.</div>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${DASH_BORDER} ${DASH_TABLE_HEAD}`}>
            <th className="!py-3 !pr-4 font-medium">Arrival date</th>
            <th className="!py-3 !pr-4 text-right font-medium">Amount</th>
            <th className="!py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className={DASH_DIVIDE}>
          {state.payouts.map((p) => (
            <tr key={p.id}>
              <td className="!py-3 !pr-4 whitespace-nowrap text-[#1F1B16]">{formatLongDate(p.arrivalDate)}</td>
              <td className="!py-3 !pr-4 text-right tabular-nums text-[#1F1B16]">{formatCurrency(p.amountCents)}</td>
              <td className="!py-3 text-[#3D3730]">{PAYOUT_STATUS_LABEL[p.status] ?? p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckoutFeesCard({
  fees,
  onEdit,
}: {
  fees: { name: string; amount: number; is_active: boolean }[];
  onEdit?: () => void;
}) {
  const active = fees.filter((fee) => fee.is_active);
  return (
    <section className={`${DASH_CARD} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={DASH_CARD_TITLE}>Checkout fees</h2>
          {active.length === 0 ? (
            <p className="mt-1 text-sm text-[#5C554C]">
              You can add range, ammo, or similar fees you already charge.
            </p>
          ) : (
            <>
              <ul className="mt-2 max-w-md space-y-1 text-sm text-[#2B2520]">
                {active.map((fee, index) => (
                  <li key={`${fee.name}-${index}`} className="flex justify-between gap-4">
                    <span>{fee.name}</span>
                    <span className="tabular-nums">${Number(fee.amount).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-[#5C554C]">
                These are added at checkout on top of the class price and paid to you.
              </p>
            </>
          )}
          <p className="mt-2 text-sm text-[#5C554C]">
            The 6% CarryClass transaction fee applies to every class and is not included in these amounts.
          </p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={`${DASH_BTN_SECONDARY} !px-3 !py-1.5`}
          >
            Edit fees
          </button>
        )}
      </div>
    </section>
  );
}
