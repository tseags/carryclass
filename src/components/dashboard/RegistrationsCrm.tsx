"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VendorClassType } from "@/lib/onboarding-db";
import type { DashboardRegistration } from "@/lib/dashboard-db";
import { getCountyDisplayName } from "@/data/counties";
import { Drawer } from "./Drawer";
import { formatLongDate, formatTime } from "./dashboard-format";

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

function classTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  return CLASS_TYPE_LABELS[type] ?? "—";
}

function sessionKey(r: DashboardRegistration): string {
  if (r.classSessionId) return r.classSessionId;
  return `${r.classDate ?? ""}|${r.classTitle ?? ""}`;
}

function paymentPill(status: string) {
  const s = status.toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700";
  if (s === "PENDING") return "bg-amber-50 text-amber-700";
  if (s === "REFUNDED") return "bg-blue-50 text-blue-700";
  if (s === "CANCELLED") return "bg-gray-100 text-gray-500";
  return "bg-gray-100 text-gray-500";
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
      const hay = `${r.customerName} ${r.customerEmail}`.toLowerCase();
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
  "rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30";

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
      const label = `${classTypeLabel(r.classType)}${date ? ` · ${formatLongDate(r.classDate)} · ${formatTime(r.classDate)}` : ""}`;
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
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-5 sm:p-6">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Registrations</h2>
          <p className="text-sm text-gray-500">Students who booked through CarryClass.</p>
        </div>
        <p className="shrink-0 text-sm text-gray-500">
          {filtered.length === total
            ? `${total} ${total === 1 ? "student" : "students"}`
            : `${filtered.length} of ${total}`}
        </p>
      </div>

      {isSample && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing sample registrations so you can try filters. Live bookings will replace this list.
        </p>
      )}

      {/* Compact filter toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[180px] flex-1">
          <span className="sr-only">Search students</span>
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
            placeholder="Search name or email"
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30"
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
                {classTypeLabel(t)}
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
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            More filters
          </button>
          {moreOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">When</label>
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
                    <label className="mb-1 block text-xs font-medium text-gray-500">Day</label>
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
                    <label className="mb-1 block text-xs font-medium text-gray-500">Time</label>
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
        <p className="py-8 text-center text-sm text-gray-500">
          No registrations yet. They&apos;ll appear here when students book through CarryClass.
        </p>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-gray-900">No students match these filters</p>
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
            showCounty={showCounty}
            onSelect={(id) => setSelectedId(id)}
            selectedId={selectedId}
          />
          {filtered.length > visibleCount && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Show more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      <StudentDrawer registration={selected} onClose={() => setSelectedId(null)} />
    </section>
  );
}

function RegistrationsTable({
  registrations,
  showCounty,
  onSelect,
  selectedId,
}: {
  registrations: DashboardRegistration[];
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
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
            <th className="!py-4 !pr-4">Name</th>
            <th className="!py-4 !pr-4">Class</th>
            {showCounty && <th className="!py-4 !pr-4">County</th>}
            <th className="!py-4 !pr-4">Date</th>
            <th className="!py-4">Payment</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                selectedId === r.id ? "bg-[#C1440E]/5" : ""
              }`}
            >
              <td className="!py-5 !pr-4 align-top">
                <p className="!m-0 font-medium leading-snug text-gray-900 line-clamp-2">{r.customerName}</p>
                <p className="!m-0 !mt-0.5 text-xs leading-snug text-gray-500 line-clamp-1">{r.customerEmail}</p>
              </td>
              <td className="!py-5 !pr-4 align-top text-gray-600">
                <span className="block leading-snug line-clamp-2" title={classTypeLabel(r.classType)}>
                  {classTypeLabel(r.classType)}
                </span>
              </td>
              {showCounty && (
                <td className="!py-5 !pr-4 align-top leading-snug text-gray-600">
                  {r.countySlug ? getCountyDisplayName(r.countySlug) : "—"}
                </td>
              )}
              <td className="!py-5 !pr-4 align-top leading-snug text-gray-900">
                <span className="line-clamp-2">{formatLongDate(r.classDate)}</span>
                <span className="text-xs text-gray-500">{formatTime(r.classDate)}</span>
              </td>
              <td className="!py-5 align-top">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentPill(r.status)}`}>
                  {r.status}
                </span>
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
  onClose,
}: {
  registration: DashboardRegistration | null;
  onClose: () => void;
}) {
  const r = registration;
  return (
    <Drawer open={r !== null} onClose={onClose} title={r?.customerName ?? "Student"}>
      {r && (
        <dl className="space-y-4 p-5 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</dt>
            <dd className="mt-1">
              <a href={`mailto:${r.customerEmail}`} className="text-[#C1440E] hover:underline">
                {r.customerEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Class</dt>
            <dd className="mt-1 text-gray-900">{classTypeLabel(r.classType)}</dd>
          </div>
          {r.countySlug && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">County</dt>
              <dd className="mt-1 text-gray-900">{getCountyDisplayName(r.countySlug)}</dd>
            </div>
          )}
          {r.location && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Location</dt>
              <dd className="mt-1 text-gray-900">{r.location}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Class date</dt>
            <dd className="mt-1 text-gray-900">
              {formatLongDate(r.classDate)} · {formatTime(r.classDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Registered</dt>
            <dd className="mt-1 text-gray-900">{formatLongDate(r.registeredOn)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Payment</dt>
            <dd className="mt-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentPill(r.status)}`}>
                {r.status}
              </span>
            </dd>
          </div>
        </dl>
      )}
    </Drawer>
  );
}
