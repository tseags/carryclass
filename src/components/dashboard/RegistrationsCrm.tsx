"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VendorClassType } from "@/lib/onboarding-db";
import type { DashboardRegistration } from "@/lib/dashboard-db";
import { getCountyDisplayName } from "@/data/counties";
import { Drawer } from "./Drawer";
import { formatLongDate, formatTime, sentenceCase } from "./dashboard-format";
import { canOfferRescheduleLink } from "@/lib/reschedule-eligibility";
import {
  DASH_BORDER,
  DASH_BTN_PRIMARY,
  DASH_BTN_SECONDARY,
  DASH_CARD,
  DASH_DIVIDE,
  DASH_MUTED,
  DASH_PILL,
  DASH_PILL_ACCENT,
  DASH_PILL_INFO,
  DASH_PILL_NEUTRAL,
  DASH_PILL_SUCCESS,
  DASH_SUBSECTION_TITLE,
  DASH_TABLE_HEAD,
} from "./dashboard-theme";

const PAGE_SIZE = 25;

const CLASS_TYPE_LABELS: Record<string, string> = {
  initial: "CCW Initial Training",
  renewal: "CCW Renewal Training",
  add_a_gun: "Add a Gun",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type WhenFilter = "all" | "upcoming" | "past";

interface Filters {
  query: string;
  classType: string | null;
  sessionKey: string | null;
  weekday: number | null;
  timeLabel: string | null;
  countySlug: string | null;
  when: WhenFilter;
}

const EMPTY_FILTERS: Filters = {
  query: "",
  classType: null,
  sessionKey: null,
  weekday: null,
  timeLabel: null,
  countySlug: null,
  when: "all",
};

function classTypeLabel(
  type: string | null | undefined,
  classTypes: { class_type: string; display_name?: string | null }[] = []
): string {
  if (!type) return "—";
  if (CLASS_TYPE_LABELS[type]) return CLASS_TYPE_LABELS[type];
  return classTypes.find((row) => row.class_type === type)?.display_name?.trim() || "Other class";
}

function sessionKey(r: DashboardRegistration): string {
  if (r.classSessionId) return r.classSessionId;
  return `${r.classDate ?? ""}|${r.classTitle ?? ""}`;
}

function paymentPill(status: string) {
  const s = status.toUpperCase();
  if (s === "PAID") return DASH_PILL_SUCCESS;
  if (s === "PENDING") return DASH_PILL_ACCENT;
  if (s === "REFUNDED") return DASH_PILL_INFO;
  return DASH_PILL_NEUTRAL;
}

function parseClassDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function applyFilters(regs: DashboardRegistration[], f: Filters): DashboardRegistration[] {
  const q = f.query.trim().toLowerCase();
  const now = Date.now();
  return regs.filter((r) => {
    if (q) {
      const hay = `${r.customerName} ${r.customerEmail} ${r.customerPhone ?? ""} ${
        r.confirmationCode ?? ""
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.classType && r.classType !== f.classType) return false;
    if (f.sessionKey && sessionKey(r) !== f.sessionKey) return false;
    if (f.countySlug && r.countySlug !== f.countySlug) return false;

    const date = parseClassDate(r.classDate);
    if (f.weekday !== null) {
      if (!date || date.getDay() !== f.weekday) return false;
    }
    if (f.timeLabel) {
      if (!r.classDate || formatTime(r.classDate) !== f.timeLabel) return false;
    }
    if (f.when === "upcoming") {
      if (!date || date.getTime() < now) return false;
    }
    if (f.when === "past") {
      if (!date || date.getTime() >= now) return false;
    }
    return true;
  });
}

function filtersAreActive(f: Filters): boolean {
  return (
    f.query.trim() !== "" ||
    f.classType !== null ||
    f.sessionKey !== null ||
    f.weekday !== null ||
    f.timeLabel !== null ||
    f.countySlug !== null ||
    f.when !== "all"
  );
}

function moreFiltersActive(f: Filters): boolean {
  return f.when !== "all" || f.weekday !== null || f.timeLabel !== null;
}

const DEMO_REGISTRATIONS: DashboardRegistration[] = [
  {
    id: "demo-1",
    customerName: "Jordan Maxwell",
    customerEmail: "jordan.maxwell@example.com",
    classTitle: "CCW Initial Training — Saturday Range Day",
    classType: "initial",
    classDate: "2026-08-22T16:00:00.000Z",
    registeredOn: "2026-08-14T18:22:00.000Z",
    status: "PAID",
    paidAt: "2026-08-14T18:24:00.000Z",
    classSessionId: "demo-session-sat-initial",
    location: "Livermore, Alameda County",
    countySlug: "alameda",
  },
  {
    id: "demo-2",
    customerName: "Priya Shah",
    customerEmail: "priya.shah@example.com",
    classTitle: "CCW Renewal",
    classType: "renewal",
    classDate: "2026-08-28T23:00:00.000Z",
    registeredOn: "2026-08-12T15:05:00.000Z",
    status: "PAID",
    paidAt: "2026-08-12T15:06:00.000Z",
    classSessionId: "demo-session-renewal-fri",
    location: "Concord, Contra Costa County",
    countySlug: "contra-costa",
  },
  {
    id: "demo-3",
    customerName: "Marcus Chen",
    customerEmail: "marcus.chen@example.com",
    classTitle: "Add a Gun — Evening Session",
    classType: "add_a_gun",
    classDate: "2026-09-04T01:00:00.000Z",
    registeredOn: "2026-08-18T21:40:00.000Z",
    status: "PENDING",
    paidAt: null,
    classSessionId: "demo-session-add-gun",
    location: "San Jose, Santa Clara County",
    countySlug: "santa-clara",
  },
  {
    id: "demo-4",
    customerName: "Elena Rossi",
    customerEmail: "elena.rossi@example.com",
    classTitle: "CCW Initial Training — Saturday Range Day",
    classType: "initial",
    classDate: "2026-08-22T16:00:00.000Z",
    registeredOn: "2026-08-09T11:18:00.000Z",
    status: "PAID",
    paidAt: "2026-08-09T11:19:00.000Z",
    classSessionId: "demo-session-sat-initial",
    location: "Livermore, Alameda County",
    countySlug: "alameda",
  },
  {
    id: "demo-5",
    customerName: "Devon Blake",
    customerEmail: "devon.blake@example.com",
    classTitle: "CCW Renewal",
    classType: "renewal",
    classDate: "2026-07-11T16:30:00.000Z",
    registeredOn: "2026-06-29T19:50:00.000Z",
    status: "REFUNDED",
    paidAt: "2026-06-29T19:51:00.000Z",
    classSessionId: "demo-session-renewal-past",
    location: "Redwood City, San Mateo County",
    countySlug: "san-mateo",
  },
  {
    id: "demo-6",
    customerName: "Aisha Rahman",
    customerEmail: "aisha.rahman@example.com",
    classTitle: "CCW Initial Training — Weeknight Classroom",
    classType: "initial",
    classDate: "2026-08-19T02:00:00.000Z",
    registeredOn: "2026-08-03T16:12:00.000Z",
    status: "PAID",
    paidAt: "2026-08-03T16:13:00.000Z",
    classSessionId: "demo-session-weeknight",
    location: "Oakland, Alameda County",
    countySlug: "alameda",
  },
  {
    id: "demo-7",
    customerName: "Chris Nguyen",
    customerEmail: "chris.nguyen@example.com",
    classTitle: "CCW Renewal",
    classType: "renewal",
    classDate: "2026-08-28T23:00:00.000Z",
    registeredOn: "2026-08-16T13:02:00.000Z",
    status: "CANCELLED",
    paidAt: null,
    classSessionId: "demo-session-renewal-fri",
    location: "Concord, Contra Costa County",
    countySlug: "contra-costa",
  },
  {
    id: "demo-8",
    customerName: "Sam Ortega",
    customerEmail: "sam.ortega@example.com",
    classTitle: "CCW Initial Training — Saturday Range Day",
    classType: "initial",
    classDate: "2026-08-22T16:00:00.000Z",
    registeredOn: "2026-08-17T09:40:00.000Z",
    status: "PENDING",
    paidAt: null,
    classSessionId: "demo-session-sat-initial",
    location: "Livermore, Alameda County",
    countySlug: "alameda",
  },
];

export function registrationsForDisplay(
  registrations: DashboardRegistration[]
): DashboardRegistration[] {
  return registrations.length > 0 ? registrations : DEMO_REGISTRATIONS;
}

const selectClass =
  "rounded-lg border border-[#E3DDD4] bg-white px-2.5 py-1.5 text-sm text-[#1F1B16] focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30";

export function RegistrationsCrm({
  registrations: liveRegistrations,
  classTypes,
}: {
  registrations: DashboardRegistration[];
  classTypes: VendorClassType[];
}) {
  const isSample = liveRegistrations.length === 0;
  const registrations = isSample ? DEMO_REGISTRATIONS : liveRegistrations;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const typeOptions = useMemo(() => {
    const fromRows = new Set(registrations.map((r) => r.classType).filter(Boolean) as string[]);
    const fromVendor = classTypes.filter((t) => t.is_active).map((t) => t.class_type);
    const ordered = ["initial", "renewal", "add_a_gun"];
    const rest = [...fromRows, ...fromVendor].filter((t) => !ordered.includes(t));
    return [...ordered.filter((t) => fromRows.has(t) || fromVendor.includes(t)), ...[...new Set(rest)]];
  }, [registrations, classTypes]);

  const sessionOptions = useMemo(() => {
    const seen = new Map<string, { key: string; label: string; sort: number }>();
    for (const r of registrations) {
      const key = sessionKey(r);
      if (seen.has(key)) continue;
      const date = parseClassDate(r.classDate);
      const label = `${classTypeLabel(r.classType, classTypes)}${date ? ` · ${formatLongDate(r.classDate)} · ${formatTime(r.classDate)}` : ""}`;
      seen.set(key, { key, label, sort: date?.getTime() ?? 0 });
    }
    return [...seen.values()].sort((a, b) => a.sort - b.sort);
  }, [registrations]);

  const weekdayOptions = useMemo(() => {
    const days = new Set<number>();
    for (const r of registrations) {
      const d = parseClassDate(r.classDate);
      if (d) days.add(d.getDay());
    }
    return [...days].sort((a, b) => a - b);
  }, [registrations]);

  const timeOptions = useMemo(() => {
    const times = new Set<string>();
    for (const r of registrations) {
      if (r.classDate) times.add(formatTime(r.classDate));
    }
    return [...times].sort((a, b) => a.localeCompare(b, "en-US", { numeric: true }));
  }, [registrations]);

  const countyOptions = useMemo(() => {
    const slugs = new Set<string>();
    for (const r of registrations) {
      if (r.countySlug) slugs.add(r.countySlug);
    }
    return [...slugs].sort((a, b) => getCountyDisplayName(a).localeCompare(getCountyDisplayName(b)));
  }, [registrations]);

  const showCounty = countyOptions.length > 0;

  const filtered = useMemo(() => applyFilters(registrations, filters), [registrations, filters]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  useEffect(() => {
    if (!moreOpen) return;
    function onDocClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [moreOpen]);

  const selected =
    filtered.find((r) => r.id === selectedId) ??
    registrations.find((r) => r.id === selectedId) ??
    null;
  const visible = filtered.slice(0, visibleCount);
  const active = filtersAreActive(filters);
  const total = registrations.length;

  function patch(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setMoreOpen(false);
  }

  return (
    <section className={`${DASH_CARD} p-5 sm:p-6`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={DASH_SUBSECTION_TITLE}>Registrations</h2>
          <p className={`!mb-0 !mt-0.5 text-sm ${DASH_MUTED}`}>Students who booked through CarryClass.</p>
        </div>
        <p className={`!m-0 shrink-0 text-sm tabular-nums ${DASH_MUTED}`}>
          {filtered.length === total
            ? `${total} ${total === 1 ? "student" : "students"}`
            : `${filtered.length} of ${total}`}
        </p>
      </div>

      {isSample && (
        <p className="!mb-3 !mt-0 rounded-lg border border-[#F0DCC8] bg-[#FDF6EE] px-3 py-2 text-sm text-[#8A4B1E]">
          Showing sample registrations so you can try filters. Live bookings will replace this list.
        </p>
      )}

      {/* Compact filter toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[180px] flex-1">
          <span className="sr-only">Search students</span>
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A837A]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="Search name, email, or confirmation #"
            className="w-full rounded-lg border border-[#E3DDD4] py-1.5 pl-9 pr-3 text-sm text-[#1F1B16] placeholder:text-[#8A837A] focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30"
          />
        </label>

        {typeOptions.length > 0 && (
          <select
            value={filters.classType ?? ""}
            onChange={(e) => patch({ classType: e.target.value || null })}
            className={`${selectClass} min-w-[130px]`}
            aria-label="Class type"
          >
            <option value="">All class types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {classTypeLabel(t, classTypes)}
              </option>
            ))}
          </select>
        )}

        {sessionOptions.length > 0 && (
          <select
            value={filters.sessionKey ?? ""}
            onChange={(e) => patch({ sessionKey: e.target.value || null })}
            className={`${selectClass} min-w-[140px] max-w-[240px]`}
            aria-label="Class"
          >
            <option value="">All classes</option>
            {sessionOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {showCounty && (
          <select
            value={filters.countySlug ?? ""}
            onChange={(e) => patch({ countySlug: e.target.value || null })}
            className={`${selectClass} min-w-[120px]`}
            aria-label="County"
          >
            <option value="">All counties</option>
            {countyOptions.map((slug) => (
              <option key={slug} value={slug}>
                {getCountyDisplayName(slug)}
              </option>
            ))}
          </select>
        )}

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className={`rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
              moreFiltersActive(filters)
                ? "border-[#C1440E]/30 bg-[#C1440E]/5 font-medium text-[#C1440E]"
                : "border-[#E3DDD4] text-[#5C554C] hover:bg-[#FBF9F6]"
            }`}
          >
            More filters
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-xl border border-[#ECE7E0] bg-white p-3 shadow-[0_12px_32px_-12px_rgba(31,27,22,0.25)]">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#7A7268]">When</label>
                  <select
                    value={filters.when}
                    onChange={(e) => patch({ when: e.target.value as WhenFilter })}
                    className={`${selectClass} w-full`}
                  >
                    <option value="all">All dates</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                  </select>
                </div>
                {weekdayOptions.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#7A7268]">Day</label>
                    <select
                      value={filters.weekday ?? ""}
                      onChange={(e) =>
                        patch({ weekday: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      className={`${selectClass} w-full`}
                    >
                      <option value="">Any day</option>
                      {weekdayOptions.map((d) => (
                        <option key={d} value={d}>
                          {DAY_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {timeOptions.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#7A7268]">Time</label>
                    <select
                      value={filters.timeLabel ?? ""}
                      onChange={(e) => patch({ timeLabel: e.target.value || null })}
                      className={`${selectClass} w-full`}
                    >
                      <option value="">Any time</option>
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {active && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-[#C1440E] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {registrations.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#7A7268]">
          No registrations yet. They&apos;ll appear here when students book through CarryClass.
        </p>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-[#1F1B16]">No students match these filters</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm font-medium text-[#C1440E] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <RegistrationsTable
            registrations={visible}
            classTypes={classTypes}
            showCounty={showCounty}
            onSelect={(id) => setSelectedId(id)}
            selectedId={selectedId}
          />
          {filtered.length > visibleCount && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className={DASH_BTN_SECONDARY}
              >
                Show more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      <StudentDrawer
        registration={selected}
        classTypes={classTypes}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}

function RegistrationsTable({
  registrations,
  classTypes,
  showCounty,
  onSelect,
  selectedId,
}: {
  registrations: DashboardRegistration[];
  classTypes: { class_type: string; display_name?: string | null }[];
  showCounty: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[28%]" />
          {showCounty && <col className="w-[14%]" />}
          <col className="w-[16%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className={`border-b ${DASH_BORDER} ${DASH_TABLE_HEAD}`}>
            <th className="!py-3 !pr-4 font-medium">Name</th>
            <th className="!py-3 !pr-4 font-medium">Class</th>
            {showCounty && <th className="!py-3 !pr-4 font-medium">County</th>}
            <th className="!py-3 !pr-4 font-medium">Date</th>
            <th className="!py-3 font-medium">Payment</th>
          </tr>
        </thead>
        <tbody className={DASH_DIVIDE}>
          {registrations.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`cursor-pointer transition-colors hover:bg-[#FBF9F6] ${
                selectedId === r.id ? "bg-[#C1440E]/5" : ""
              }`}
            >
              <td className="!py-5 !pr-4 align-top">
                <p className="!m-0 font-medium leading-snug text-[#1F1B16] line-clamp-2">{r.customerName}</p>
                <p className="!m-0 !mt-0.5 text-xs leading-snug text-[#7A7268] line-clamp-1">{r.customerEmail}</p>
                {r.customerPhone && (
                  <p className="!m-0 !mt-0.5 text-xs leading-snug text-[#7A7268] line-clamp-1">{r.customerPhone}</p>
                )}
                {canOfferRescheduleLink({
                  status: r.status,
                  customerEmail: r.customerEmail,
                  classDateIso: r.classDate,
                }) && (
                  <p className="!m-0 !mt-1.5 text-[11px] font-medium text-[#C1440E]">
                    Reschedule available
                  </p>
                )}
              </td>
              <td className="!py-5 !pr-4 align-top text-[#5C554C]">
                <span className="block leading-snug line-clamp-2" title={classTypeLabel(r.classType, classTypes)}>
                  {classTypeLabel(r.classType, classTypes)}
                </span>
              </td>
              {showCounty && (
                <td className="!py-5 !pr-4 align-top leading-snug text-[#5C554C]">
                  {r.countySlug ? getCountyDisplayName(r.countySlug) : "—"}
                </td>
              )}
              <td className="!py-5 !pr-4 align-top leading-snug text-[#1F1B16]">
                <span className="line-clamp-2">{formatLongDate(r.classDate)}</span>
                <span className="text-xs text-[#7A7268]">{formatTime(r.classDate)}</span>
              </td>
              <td className="!py-5 align-top">
                <span className={`${DASH_PILL} ${paymentPill(r.status)}`}>{sentenceCase(r.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentDrawer({
  registration,
  classTypes,
  onClose,
}: {
  registration: DashboardRegistration | null;
  classTypes: { class_type: string; display_name?: string | null }[];
  onClose: () => void;
}) {
  const r = registration;
  const [sendState, setSendState] = useState<
    null | "sending" | { ok: true; sentTo: string } | { ok: false; error: string }
  >(null);

  useEffect(() => {
    setSendState(null);
  }, [r?.id]);

  const canReschedule =
    r != null &&
    canOfferRescheduleLink({
      status: r.status,
      customerEmail: r.customerEmail,
      classDateIso: r.classDate,
    });

  async function sendRescheduleLink() {
    if (!r || sendState === "sending") return;
    setSendState("sending");
    try {
      const res = await fetch(`/api/dashboard/registrations/${encodeURIComponent(r.id)}/reschedule-link`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; sentTo?: string };
      if (!res.ok) {
        setSendState({ ok: false, error: data.error || "Failed to send reschedule link." });
        return;
      }
      setSendState({ ok: true, sentTo: data.sentTo || r.customerEmail });
    } catch {
      setSendState({ ok: false, error: "Failed to send reschedule link. Try again." });
    }
  }

  return (
    <Drawer open={r !== null} onClose={onClose} title={r?.customerName ?? "Student"}>
      {r && (
        <div className="p-5">
          <dl className="space-y-4 text-sm">
            {r.confirmationCode && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">
                  Confirmation #
                </dt>
                <dd className="mt-1 font-mono font-semibold tracking-wider text-[#1F1B16]">
                  {r.confirmationCode}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Email</dt>
              <dd className="mt-1">
                <a href={`mailto:${r.customerEmail}`} className="text-[#C1440E] hover:underline">
                  {r.customerEmail}
                </a>
              </dd>
            </div>
            {r.customerPhone && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${r.customerPhone}`} className="text-[#C1440E] hover:underline">
                    {r.customerPhone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Class</dt>
              <dd className="mt-1 text-[#1F1B16]">{classTypeLabel(r.classType, classTypes)}</dd>
            </div>
            {r.countySlug && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">County</dt>
                <dd className="mt-1 text-[#1F1B16]">{getCountyDisplayName(r.countySlug)}</dd>
              </div>
            )}
            {r.location && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Location</dt>
                <dd className="mt-1 text-[#1F1B16]">{r.location}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Class date</dt>
              <dd className="mt-1 text-[#1F1B16]">
                {formatLongDate(r.classDate)} · {formatTime(r.classDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Registered</dt>
              <dd className="mt-1 text-[#1F1B16]">{formatLongDate(r.registeredOn)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[#8A837A]">Payment</dt>
              <dd className="mt-1">
                <span className={`${DASH_PILL} ${paymentPill(r.status)}`}>{sentenceCase(r.status)}</span>
              </dd>
            </div>
          </dl>

          {canReschedule && (
            <div className="mt-6 border-t border-[#ECE7E0] pt-5">
              <p className="!m-0 text-sm font-medium text-[#1F1B16]">Need to move this student?</p>
              <p className="!m-0 !mt-1 text-xs text-[#7A7268]">
                Send a link so they can pick another upcoming class of the same type. No refund or new
                charge.
              </p>
              <button
                type="button"
                onClick={() => void sendRescheduleLink()}
                disabled={sendState === "sending" || (sendState != null && sendState.ok === true)}
                className={`mt-3 w-full ${DASH_BTN_PRIMARY}`}
              >
                {sendState === "sending"
                  ? "Sending…"
                  : sendState != null && sendState.ok === true
                    ? "Reschedule link sent"
                    : "Send reschedule link"}
              </button>
              {sendState != null && sendState !== "sending" && sendState.ok === true && (
                <p className="!m-0 !mt-2 text-xs text-emerald-700">
                  Reschedule link sent to {sendState.sentTo}
                </p>
              )}
              {sendState != null && sendState !== "sending" && sendState.ok === false && (
                <p className="!m-0 !mt-2 text-xs text-red-700">{sendState.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
