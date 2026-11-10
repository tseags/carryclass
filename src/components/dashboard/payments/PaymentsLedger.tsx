"use client";

import { useMemo, useState } from "react";
import type { DashboardPaymentStatus } from "@/lib/dashboard-db";
import { formatCurrency, formatLongDate } from "../dashboard-format";
import {
  DASH_BORDER,
  DASH_BTN_SECONDARY,
  DASH_CARD,
  DASH_DIVIDE,
  DASH_PILL,
  DASH_PILL_ACCENT,
  DASH_PILL_SUCCESS,
  DASH_PILL_WARN,
  DASH_SUBSECTION_TITLE,
  DASH_TABLE_HEAD,
} from "../dashboard-theme";
import {
  CLASS_TYPE_OPTIONS,
  classTypeLabel,
  inWindow,
  isUpcomingPaid,
  type DayWindow,
  type PaymentFact,
} from "./payments-metrics";

export type LedgerStatusFilter = "all" | DashboardPaymentStatus;
export type LedgerSortKey = "paid" | "class" | "amount";

export interface LedgerFilters {
  classType: string;
  status: LedgerStatusFilter;
  upcomingOnly: boolean;
}

export const DEFAULT_LEDGER_FILTERS: LedgerFilters = { classType: "all", status: "all", upcomingOnly: false };

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { id: LedgerStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "PAID", label: "Paid" },
  { id: "REFUNDED", label: "Refunded" },
  { id: "PENDING", label: "Pending" },
  { id: "CANCELLED", label: "Cancelled" },
];

const STATUS_PILL: Record<DashboardPaymentStatus, string> = {
  PAID: DASH_PILL_SUCCESS,
  REFUNDED: DASH_PILL_WARN,
  PENDING: DASH_PILL_ACCENT,
  CANCELLED: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<DashboardPaymentStatus, string> = {
  PAID: "Paid",
  REFUNDED: "Refunded",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
};

function sortValue(f: PaymentFact, key: LedgerSortKey): number {
  if (key === "amount") return f.classAmountCents;
  const iso = key === "paid" ? f.paidAt ?? f.createdAt : f.classStartsAt;
  return iso ? new Date(iso).getTime() : 0;
}

export function segmentClass(active: boolean): string {
  return `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
    active
      ? "!bg-white text-[#1F1B16] shadow-sm ring-1 ring-[#E3DDD4]"
      : "!bg-transparent text-[#6B645B] hover:text-[#1F1B16]"
  }`;
}

export function PaymentsLedger({
  facts,
  dayWindow,
  rangeLabel,
  filters,
  onFiltersChange,
  now,
}: {
  facts: PaymentFact[];
  dayWindow: DayWindow;
  rangeLabel: string;
  filters: LedgerFilters;
  onFiltersChange: (next: LedgerFilters) => void;
  now: Date;
}) {
  const [sortKey, setSortKey] = useState<LedgerSortKey>("paid");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [lastFilters, setLastFilters] = useState({ filters, dayWindow });

  if (lastFilters.filters !== filters || lastFilters.dayWindow.startKey !== dayWindow.startKey) {
    setLastFilters({ filters, dayWindow });
    setPage(0);
  }

  const rows = useMemo(() => {
    const filtered = facts.filter((f) => {
      if (filters.upcomingOnly ? !isUpcomingPaid(f, now) : !inWindow(f, dayWindow)) return false;
      if (filters.classType !== "all" && (f.classType ?? "other") !== filters.classType) return false;
      if (filters.status !== "all" && f.status !== filters.status) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => (sortValue(a, sortKey) - sortValue(b, sortKey)) * dir);
  }, [facts, filters, dayWindow, now, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: LedgerSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortHeader(key: LedgerSortKey, label: string, alignRight = false) {
    const active = sortKey === key;
    return (
      <th
        className={`!py-3 !pr-4 whitespace-nowrap ${alignRight ? "text-right" : ""}`}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex items-center gap-1 !bg-transparent uppercase tracking-wide ${
            active ? "text-[#1F1B16]" : "text-[#7A7268] hover:text-[#1F1B16]"
          }`}
        >
          {label}
          <span aria-hidden className="text-[10px]">
            {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <section id="payments-ledger" className={`scroll-mt-24 ${DASH_CARD} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={DASH_SUBSECTION_TITLE}>Payments</h2>
          <div className="text-xs text-[#7A7268]">
            {filters.upcomingOnly ? "Paid seats in upcoming classes" : `${rangeLabel} · by payment date`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="!mb-0 flex items-center gap-2 text-xs !font-medium text-[#7A7268]">
            Class type
            <select
              value={filters.classType}
              onChange={(e) => onFiltersChange({ ...filters, classType: e.target.value })}
              className="rounded-lg !border border-[#E3DDD4] bg-white px-2 py-1 text-sm text-[#1F1B16] focus:border-[#C1440E]/50 focus:outline-none focus:ring-2 focus:ring-[#C1440E]/15"
            >
              <option value="all">All class types</option>
              {CLASS_TYPE_OPTIONS.map((ct) => (
                <option key={ct.key} value={ct.key}>
                  {ct.label}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="Status" className="flex gap-1 rounded-lg bg-[#F1ECE5] p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={filters.status === opt.id}
                onClick={() => onFiltersChange({ ...filters, status: opt.id })}
                className={segmentClass(filters.status === opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filters.upcomingOnly && (
        <div className={`mt-3 ${DASH_PILL} ${DASH_PILL_ACCENT} gap-2 !px-2.5 !py-1`}>
          Upcoming classes only
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, upcomingOnly: false })}
            className="!bg-transparent font-semibold hover:underline"
            aria-label="Clear upcoming filter"
          >
            ✕
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#7A7268]">No payments in this range.</div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${DASH_BORDER} ${DASH_TABLE_HEAD}`}>
                  {sortHeader("paid", "Paid date")}
                  <th className="!py-3 !pr-4 whitespace-nowrap">Student</th>
                  <th className="!py-3 !pr-4 whitespace-nowrap">Class type</th>
                  {sortHeader("class", "Class date")}
                  {sortHeader("amount", "Tuition", true)}
                  <th className="!py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className={DASH_DIVIDE}>
                {visible.map((f) => (
                  <tr key={f.id}>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-[#1F1B16]">{formatLongDate(f.paidAt)}</td>
                    <td className="!py-3 !pr-4 text-[#3D3730]">{f.studentName}</td>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-[#3D3730]">
                      {f.classType === "initial" || f.classType === "renewal" || f.classType === "add_a_gun"
                        ? classTypeLabel(f.classType)
                        : f.classTitle?.trim() || "Other class"}
                    </td>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-[#3D3730]">{formatLongDate(f.classStartsAt)}</td>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-right tabular-nums">
                      <span className={f.status === "REFUNDED" ? "text-[#8A837A] line-through" : "text-[#1F1B16]"}>
                        {formatCurrency(f.classAmountCents)}
                      </span>
                      {f.status === "REFUNDED" && f.refundedClassCents > 0 && (
                        <span className="block text-xs text-amber-800">
                          −{formatCurrency(f.refundedClassCents)} refunded
                        </span>
                      )}
                    </td>
                    <td className="!py-3 whitespace-nowrap">
                      <span className={`${DASH_PILL} ${STATUS_PILL[f.status]}`}>
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-[#7A7268]">
            <span>
              {current * PAGE_SIZE + 1}–{Math.min(rows.length, (current + 1) * PAGE_SIZE)} of {rows.length}
            </span>
            {pageCount > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(current - 1)}
                  disabled={current === 0}
                  className={`${DASH_BTN_SECONDARY} !px-2.5 !py-1 !text-xs`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(current + 1)}
                  disabled={current >= pageCount - 1}
                  className={`${DASH_BTN_SECONDARY} !px-2.5 !py-1 !text-xs`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
