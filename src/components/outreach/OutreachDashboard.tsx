"use client";

import { useEffect, useMemo, useState } from "react";
import { getCountyDisplayName } from "@/data/counties";
import type { OutreachContactView } from "@/lib/outreach/contacts";
import {
  OUTREACH_STAGES,
  STAGE_LABELS,
  formatDayShort,
  isDue,
  nextActionLabel,
  type OutreachStageId,
} from "@/lib/outreach/sequence";
import {
  BOOKING_TOOLS,
  BOOKING_TOOL_LABELS,
  type BookingTool,
} from "@/lib/outreach/booking";
import { OUTREACH_TAGS } from "@/lib/outreach/dedupe";
import { OutreachContactDrawer } from "./OutreachContactDrawer";
import { TAG_LABELS, selectClass, stagePill, websiteHost } from "./outreach-ui";

const PAGE_SIZE = 25;

type ViewId = "due" | "queue" | "all" | "dnc";

const VIEWS: { id: ViewId; label: string; path: string }[] = [
  { id: "due", label: "Due today", path: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  {
    id: "queue",
    label: "Website · no booking",
    path: "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18",
  },
  {
    id: "all",
    label: "All instructors",
    path: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z",
  },
  { id: "dnc", label: "Do not contact", path: "M18.36 5.64A9 9 0 115.64 18.36 9 9 0 0118.36 5.64zM5.64 5.64l12.72 12.72" },
];

const VIEW_SUBTITLES: Record<ViewId, string> = {
  due: "Calls and emails due today, plus everyone in the website · no booking queue not yet called.",
  queue: "Call instructors who have a website and no booking.",
  all: "Every California CCW instructor in the directory.",
  dnc: "Instructors you've marked do not contact.",
};

const STAT_TAGS = ["website-no-booking", "website-has-booking", "no-website", "multi-county"] as const;

interface Filters {
  query: string;
  tag: string | null;
  bookingTool: string | null;
  stage: OutreachStageId | null;
  county: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
}

const EMPTY_FILTERS: Filters = {
  query: "",
  tag: null,
  bookingTool: null,
  stage: null,
  county: null,
  hasEmail: false,
  hasPhone: false,
};

function defaultFilters(view: ViewId): Filters {
  return view === "queue" ? { ...EMPTY_FILTERS, stage: "not_contacted" } : EMPTY_FILTERS;
}

function inView(c: OutreachContactView, view: ViewId, now: Date): boolean {
  const dnc = c.doNotContact || c.stage === "do_not_contact";
  if (view === "dnc") return dnc;
  if (dnc) return false;
  if (view === "queue") return c.tags.includes("website-no-booking");
  if (view === "due") {
    return (
      isDue(c.nextActionAt, now) ||
      (c.stage === "not_contacted" && c.tags.includes("website-no-booking"))
    );
  }
  return true;
}

function matchesFilters(c: OutreachContactView, f: Filters): boolean {
  if (f.tag && !c.tags.includes(f.tag)) return false;
  if (f.bookingTool && c.bookingTool !== f.bookingTool) return false;
  if (f.stage && c.stage !== f.stage) return false;
  if (f.county && !c.counties.includes(f.county)) return false;
  if (f.hasEmail && c.emails.length === 0) return false;
  if (f.hasPhone && c.phones.length === 0) return false;
  const q = f.query.trim().toLowerCase();
  if (q) {
    const digits = q.replace(/\D/g, "");
    const hay = [
      c.displayName,
      ...c.instructorNames,
      ...c.emails,
      c.city ?? "",
      ...c.counties.map((s) => getCountyDisplayName(s)),
    ]
      .join(" ")
      .toLowerCase();
    const phoneHit = digits.length >= 3 && c.phones.some((p) => p.replace(/\D/g, "").includes(digits));
    if (!hay.includes(q) && !phoneHit) return false;
  }
  return true;
}

function filtersActive(f: Filters, view: ViewId): boolean {
  return JSON.stringify(f) !== JSON.stringify(defaultFilters(view));
}

function NavIcon({ active, path }: { active: boolean; path: string }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-[#C1440E]" : "text-gray-500"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function OutreachDashboard({
  initialContacts,
  firstName,
  imageUrl,
  voiceMissing,
  zohoMissing,
  callerId,
}: {
  initialContacts: OutreachContactView[];
  firstName: string;
  imageUrl: string | null;
  voiceMissing: string[];
  zohoMissing: string[];
  callerId: string | null;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [view, setView] = useState<ViewId>("queue");
  const [filters, setFilters] = useState<Filters>(defaultFilters("queue"));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);

  useEffect(() => setVisibleCount(PAGE_SIZE), [filters, view]);

  const viewCounts = useMemo(() => {
    const counts = { due: 0, queue: 0, all: 0, dnc: 0 } as Record<ViewId, number>;
    for (const c of contacts) for (const v of VIEWS) if (inView(c, v.id, now)) counts[v.id] += 1;
    return counts;
  }, [contacts, now]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) for (const t of c.tags) counts[t] = (counts[t] ?? 0) + 1;
    return counts;
  }, [contacts]);

  const countyOptions = useMemo(() => {
    const slugs = new Set<string>();
    for (const c of contacts) for (const s of c.counties) slugs.add(s);
    return [...slugs].sort((a, b) => getCountyDisplayName(a).localeCompare(getCountyDisplayName(b)));
  }, [contacts]);

  const filtered = useMemo(() => {
    const rows = contacts.filter((c) => inView(c, view, now) && matchesFilters(c, filters));
    if (view === "due") {
      rows.sort((a, b) => {
        const ad = a.nextActionAt ?? "";
        const bd = b.nextActionAt ?? "";
        if (ad !== bd) return ad && bd ? ad.localeCompare(bd) : ad ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      });
    }
    return rows;
  }, [contacts, view, filters, now]);

  const visible = filtered.slice(0, visibleCount);
  const selected = contacts.find((c) => c.id === selectedId) ?? null;
  const active = filtersActive(filters, view);

  function switchView(next: ViewId) {
    setView(next);
    setFilters(defaultFilters(next));
  }

  function patch(partial: Partial<Filters>) {
    // Booking-tool picks are curated across the whole list; the queue view
    // (website · no booking) would hide every instructor we just tagged.
    if (partial.bookingTool) {
      setView("all");
      setFilters({ ...EMPTY_FILTERS, bookingTool: partial.bookingTool });
      return;
    }
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function applyStatTag(tag: string) {
    setView("all");
    setFilters({ ...EMPTY_FILTERS, tag: filters.tag === tag && view === "all" ? null : tag });
  }

  function upsertContact(updated: OutreachContactView) {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function runSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/outreach/sync", { method: "POST" });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        contacts: OutreachContactView[];
        report: { contacts: number; created: number };
      };
      setContacts(json.contacts);
      setSyncMessage(
        `Synced ${json.report.contacts} instructors${json.report.created ? ` · ${json.report.created} new` : ""}.`
      );
    } catch {
      setSyncMessage("Sync failed. Try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white pt-[var(--header-height)]">
      <aside className="sticky top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[220px] shrink-0 flex-col self-start overflow-y-auto border-r border-gray-200 bg-[#F9FAFB] md:flex">
        <nav className="flex-1 py-4">
          {VIEWS.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchView(item.id)}
                className={`flex w-full items-center gap-3 border-l-2 px-5 py-2.5 text-sm transition-colors ${
                  isActive ? "border-[#C1440E] bg-[#C1440E]/5" : "border-transparent hover:bg-gray-100"
                }`}
              >
                <NavIcon active={isActive} path={item.path} />
                <span className={`flex-1 text-left ${isActive ? "font-bold text-[#C1440E]" : "text-gray-600"}`}>
                  {item.label}
                </span>
                <span className="text-xs text-gray-400">{viewCounts[item.id]}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-gray-200 px-5 py-4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, fixed tiny size
            <img src={imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C1440E]/10 text-sm font-medium text-[#C1440E]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{firstName}</p>
            <p className="truncate text-xs text-gray-500">Outreach</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
                <p className="mt-1 text-sm text-gray-600">{VIEW_SUBTITLES[view]}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={runSync}
                  disabled={syncing}
                  className="!bg-transparent text-sm font-medium text-[#C1440E] hover:underline disabled:opacity-50"
                >
                  {syncing ? "Syncing listings…" : "Sync from directory"}
                </button>
                {syncMessage && <p className="text-xs text-gray-500">{syncMessage}</p>}
              </div>
            </div>

            <label className="block md:hidden">
              <span className="sr-only">View</span>
              <select
                value={view}
                onChange={(e) => switchView(e.target.value as ViewId)}
                className={`${selectClass} w-full`}
              >
                {VIEWS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({viewCounts[v.id]})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STAT_TAGS.map((tag) => {
                const on = view === "all" && filters.tag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => applyStatTag(tag)}
                    className={`rounded-lg border p-5 text-left transition-colors hover:border-[#C1440E] hover:bg-[#C1440E]/5 ${
                      on ? "border-[#C1440E] bg-[#C1440E]/5" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <p className="text-2xl font-bold text-gray-900">{tagCounts[tag] ?? 0}</p>
                    <p className="mt-1 text-sm font-medium text-gray-700">{TAG_LABELS[tag]}</p>
                    <p className="text-xs text-gray-400">of {contacts.length} CA instructors</p>
                  </button>
                );
              })}
            </div>

            <section className="rounded-lg border border-gray-200 bg-gray-50 p-5 sm:p-6">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {VIEWS.find((v) => v.id === view)?.label}
                  </h2>
                  <p className="text-sm text-gray-500">Click an instructor to call, log, and see email.</p>
                </div>
                <p className="shrink-0 text-sm text-gray-500">
                  {filtered.length} {filtered.length === 1 ? "instructor" : "instructors"}
                </p>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="relative min-w-[200px] flex-1">
                  <span className="sr-only">Search instructors</span>
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
                    placeholder="Search name, email, phone, city, county"
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30"
                  />
                </label>

                <select
                  value={filters.tag ?? ""}
                  onChange={(e) => patch({ tag: e.target.value || null })}
                  className={`${selectClass} min-w-[150px]`}
                  aria-label="Tag"
                >
                  <option value="">All tags</option>
                  {OUTREACH_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {TAG_LABELS[t]} ({tagCounts[t] ?? 0})
                    </option>
                  ))}
                </select>

                <select
                  value={filters.bookingTool ?? ""}
                  onChange={(e) => patch({ bookingTool: e.target.value || null })}
                  className={`${selectClass} min-w-[160px]`}
                  aria-label="Booking tool"
                >
                  <option value="">All booking tools</option>
                  {BOOKING_TOOLS.map((tool) => (
                    <option key={tool} value={tool}>
                      {BOOKING_TOOL_LABELS[tool]} (
                      {contacts.filter((c) => c.bookingTool === tool).length})
                    </option>
                  ))}
                </select>

                <select
                  value={filters.stage ?? ""}
                  onChange={(e) => patch({ stage: (e.target.value || null) as OutreachStageId | null })}
                  className={`${selectClass} min-w-[140px]`}
                  aria-label="Stage"
                >
                  <option value="">All stages</option>
                  {OUTREACH_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.county ?? ""}
                  onChange={(e) => patch({ county: e.target.value || null })}
                  className={`${selectClass} min-w-[130px]`}
                  aria-label="County"
                >
                  <option value="">All counties</option>
                  {countyOptions.map((slug) => (
                    <option key={slug} value={slug}>
                      {getCountyDisplayName(slug)}
                    </option>
                  ))}
                </select>

                {(["hasEmail", "hasPhone"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patch({ [key]: !filters[key] })}
                    aria-pressed={filters[key]}
                    className={`rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                      filters[key]
                        ? "border-[#C1440E]/30 bg-[#C1440E]/5 font-medium text-[#C1440E]"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {key === "hasEmail" ? "Has email" : "Has phone"}
                  </button>
                ))}

                {active && (
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters(view))}
                    className="!bg-transparent text-sm font-medium text-[#C1440E] hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {contacts.length === 0 ? "No instructors yet" : "No instructors match these filters"}
                  </p>
                  {contacts.length === 0 ? (
                    <p className="mt-1 text-sm text-gray-500">Sync from the directory to load the list.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFilters(defaultFilters(view))}
                      className="mt-2 !bg-transparent text-sm font-medium text-[#C1440E] hover:underline"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <ContactsTable
                    contacts={visible}
                    now={now}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                  {filtered.length > visibleCount && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Show more ({filtered.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <OutreachContactDrawer
        contact={selected}
        onClose={() => setSelectedId(null)}
        onContactChange={upsertContact}
        voiceMissing={voiceMissing}
        zohoMissing={zohoMissing}
        callerId={callerId}
      />
    </div>
  );
}

function NextActionCell({ contact, now }: { contact: OutreachContactView; now: Date }) {
  const label = nextActionLabel(contact.stage);
  if (contact.stage === "not_contacted") {
    return (
      <span className="font-medium text-[#C1440E]">
        {label} <span className="text-xs font-normal text-gray-500">· now</span>
      </span>
    );
  }
  if (!contact.nextActionAt) return <span className="text-gray-400">{label}</span>;
  const due = isDue(contact.nextActionAt, now);
  return (
    <span className={due ? "font-medium text-[#C1440E]" : "text-gray-900"}>
      {label}{" "}
      <span className={`text-xs font-normal ${due ? "text-[#C1440E]" : "text-gray-500"}`}>
        · {due ? "due " : ""}
        {formatDayShort(contact.nextActionAt)}
      </span>
    </span>
  );
}

function ContactsTable({
  contacts,
  now,
  selectedId,
  onSelect,
}: {
  contacts: OutreachContactView[];
  now: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[20%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
            <th className="!py-4 !pr-4">Instructor</th>
            <th className="!py-4 !pr-4">County</th>
            <th className="!py-4 !pr-4">Phone</th>
            <th className="!py-4 !pr-4">Email</th>
            <th className="!py-4 !pr-4">Stage</th>
            <th className="!py-4">Next action</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const host = websiteHost(c.website);
            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-white ${
                  selectedId === c.id ? "bg-[#C1440E]/5" : ""
                }`}
              >
                <td className="!py-5 !pr-4 align-top">
                  <p className="!m-0 font-medium leading-snug text-gray-900 line-clamp-2">{c.displayName}</p>
                  <p className="!m-0 !mt-0.5 text-xs leading-snug text-gray-500 line-clamp-1">
                    {[
                      c.city,
                      host,
                      c.bookingTool
                        ? BOOKING_TOOL_LABELS[c.bookingTool as BookingTool] ?? c.bookingTool
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </td>
                <td className="!py-5 !pr-4 align-top leading-snug text-gray-600">
                  {c.primaryCounty ? getCountyDisplayName(c.primaryCounty) : "—"}
                  {c.counties.length > 1 && (
                    <span className="block text-xs text-gray-400">+{c.counties.length - 1} more</span>
                  )}
                </td>
                <td className="!py-5 !pr-4 align-top leading-snug text-gray-900">
                  {c.phones[0] ?? <span className="text-gray-400">—</span>}
                  {c.phones.length > 1 && (
                    <span className="block text-xs text-gray-400">+{c.phones.length - 1} more</span>
                  )}
                </td>
                <td className="!py-5 !pr-4 align-top leading-snug text-gray-600">
                  <span className="block truncate">{c.emails[0] ?? <span className="text-gray-400">—</span>}</span>
                  {c.emails.length > 1 && (
                    <span className="block text-xs text-gray-400">+{c.emails.length - 1} more</span>
                  )}
                </td>
                <td className="!py-5 !pr-4 align-top">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${stagePill(c.stage)}`}>
                    {STAGE_LABELS[c.stage]}
                  </span>
                </td>
                <td className="!py-5 align-top leading-snug">
                  <NextActionCell contact={c} now={now} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
