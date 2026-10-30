"use client";

import { useMemo, useState } from "react";
import type { DashboardPaymentStatus } from "@/lib/dashboard-db";
import { formatCurrency, formatLongDate } from "../dashboard-format";
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
  PAID: "bg-emerald-50 text-emerald-700",
  REFUNDED: "bg-amber-50 text-amber-800",
  PENDING: "bg-gray-100 text-gray-600",
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
      ? "!bg-white text-[#C1440E] shadow-sm ring-1 ring-gray-200"
      : "!bg-transparent text-gray-600 hover:text-gray-900"
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
            active ? "text-gray-900" : "text-gray-400 hover:text-gray-700"
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
    <section id="payments-ledger" className="scroll-mt-24 rounded-lg !border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="!mb-0 !text-lg font-semibold !leading-7 text-gray-900">Payments</h2>
          <div className="text-xs text-gray-500">
            {filters.upcomingOnly ? "Paid seats in upcoming classes" : `${rangeLabel} · by payment date`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="!mb-0 flex items-center gap-2 text-xs !font-medium text-gray-500">
            Class type
            <select
              value={filters.classType}
              onChange={(e) => onFiltersChange({ ...filters, classType: e.target.value })}
              className="rounded-md !border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
            >
              <option value="all">All class types</option>
              {CLASS_TYPE_OPTIONS.map((ct) => (
                <option key={ct.key} value={ct.key}>
                  {ct.label}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="Status" className="flex gap-1 rounded-lg bg-gray-100 p-1">
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
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#C1440E]/10 px-3 py-1 text-xs font-medium text-[#C1440E]">
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
        <div className="py-10 text-center text-sm text-gray-500">No payments in this range.</div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  {sortHeader("paid", "Paid date")}
                  <th className="!py-3 !pr-4 whitespace-nowrap">Student</th>
                  <th className="!py-3 !pr-4 whitespace-nowrap">Class type</th>
                  {sortHeader("class", "Class date")}
                  {sortHeader("amount", "Tuition", true)}
                  <th className="!py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 last:border-0">
                    <td className="!py-3 !pr-4 whitespace-nowrap text-gray-900">{formatLongDate(f.paidAt)}</td>
                    <td className="!py-3 !pr-4 text-gray-700">{f.studentName}</td>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-gray-700">
                      {f.classType === "initial" || f.classType === "renewal" || f.classType === "add_a_gun"
                        ? classTypeLabel(f.classType)
                        : f.classTitle?.trim() || "Other class"}
                    </td>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-gray-700">{formatLongDate(f.classStartsAt)}</td>
                    <td className="!py-3 !pr-4 whitespace-nowrap text-right tabular-nums">
                      <span className={f.status === "REFUNDED" ? "text-gray-400 line-through" : "text-gray-900"}>
                        {formatCurrency(f.classAmountCents)}
                      </span>
                      {f.status === "REFUNDED" && f.refundedClassCents > 0 && (
                        <span className="block text-xs text-amber-800">
                          −{formatCurrency(f.refundedClassCents)} refunded
                        </span>
                      )}
                    </td>
                    <td className="!py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[f.status]}`}>
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>
              {current * PAGE_SIZE + 1}–{Math.min(rows.length, (current + 1) * PAGE_SIZE)} of {rows.length}
            </span>
            {pageCount > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(current - 1)}
                  disabled={current === 0}
                  className="rounded-md !border border-gray-300 !bg-white px-2.5 py-1 font-medium text-gray-700 hover:!bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(current + 1)}
                  disabled={current >= pageCount - 1}
                  className="rounded-md !border border-gray-300 !bg-white px-2.5 py-1 font-medium text-gray-700 hover:!bg-gray-50 disabled:opacity-40"
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
