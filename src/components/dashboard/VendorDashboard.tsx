"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { VendorProfile, VendorCalendarClass, VendorClassType, VendorEmailTemplate } from "@/lib/onboarding-db";
import type { DashboardReview, DashboardRegistration, DashboardStats, DashboardPayout } from "@/lib/dashboard-db";
import { ReviewsDrawer } from "./ReviewsDrawer";
import { EmailEditorDrawer, type EmailTemplateType } from "./EmailEditorDrawer";
import { ClassEditorDrawer } from "./ClassEditorDrawer";
import { AddClassDrawer } from "./AddClassDrawer";
import {
  formatStudentName,
  formatLongDate,
  formatShortDate,
  formatTime,
  formatCurrency,
} from "./dashboard-format";

type TabId =
  | "overview"
  | "listing"
  | "classes"
  | "registrations"
  | "emails"
  | "payments"
  | "settings";

const NAV_ITEMS: { id: TabId; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: (a) => <NavIcon active={a} path="M3 12l9-9 9 9M5 10v10h14V10" /> },
  { id: "listing", label: "My Listing", icon: (a) => <NavIcon active={a} path="M4 6h16M4 12h16M4 18h7" /> },
  { id: "classes", label: "Classes & Schedule", icon: (a) => <NavIcon active={a} path="M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" /> },
  { id: "registrations", label: "Registrations", icon: (a) => <NavIcon active={a} path="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /> },
  { id: "emails", label: "Emails", icon: (a) => <NavIcon active={a} path="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" /> },
  { id: "payments", label: "Payments", icon: (a) => <NavIcon active={a} path="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" /> },
  { id: "settings", label: "Settings", icon: (a) => <NavIcon active={a} path="M10.32 4.32a2 2 0 013.36 0l.4.65a2 2 0 002.18.9l.74-.18a2 2 0 012.4 2.4l-.18.74a2 2 0 00.9 2.18l.65.4a2 2 0 010 3.36l-.65.4a2 2 0 00-.9 2.18l.18.74a2 2 0 01-2.4 2.4l-.74-.18a2 2 0 00-2.18.9l-.4.65a2 2 0 01-3.36 0l-.4-.65a2 2 0 00-2.18-.9l-.74.18a2 2 0 01-2.4-2.4l.18-.74a2 2 0 00-.9-2.18l-.65-.4a2 2 0 010-3.36l.65-.4a2 2 0 00.9-2.18l-.18-.74a2 2 0 012.4-2.4l.74.18a2 2 0 002.18-.9l.4-.65zM12 15a3 3 0 100-6 3 3 0 000 6z" /> },
];

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

const TEMPLATE_META: { type: EmailTemplateType; name: string; defaultTiming: string }[] = [
  { type: "confirmation", name: "Booking Confirmation", defaultTiming: "Sent immediately on booking" },
  { type: "reminder", name: "Class Reminder", defaultTiming: "24 hours before" },
  { type: "followup", name: "Post-Class Follow-Up", defaultTiming: "1 day after" },
];

const CLASS_TYPE_LABELS: Record<string, string> = {
  initial: "CCW Initial Training",
  renewal: "CCW Renewal Training",
  add_a_gun: "Add a Gun",
};

const TIMING_LABELS: Record<string, string> = {
  "24h_before": "24 hours before",
  "48h_before": "48 hours before",
  "1w_before": "1 week before",
  "1d_after": "1 day after",
  "3d_after": "3 days after",
  "7d_after": "7 days after",
};

interface Props {
  vendor: VendorProfile;
  firstName: string;
  classes: VendorCalendarClass[];
  classTypes: VendorClassType[];
  registrations: DashboardRegistration[];
  reviews: DashboardReview[];
  templates: Record<string, Partial<VendorEmailTemplate>>;
  stats: DashboardStats;
  payout: DashboardPayout;
  publicProfileUrl: string | null;
}

export function VendorDashboard(props: Props) {
  const { vendor, firstName, publicProfileUrl } = props;
  const { user } = useUser();
  const [tab, setTab] = useState<TabId>("overview");
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [editorType, setEditorType] = useState<EmailTemplateType | null>(null);
  const [templates, setTemplates] = useState(props.templates);
  const [classes, setClasses] = useState(props.classes);
  const [editingClass, setEditingClass] = useState<VendorCalendarClass | null>(null);
  const [addingClass, setAddingClass] = useState(false);

  function handleTemplateSaved(type: EmailTemplateType, fields: Partial<VendorEmailTemplate>) {
    setTemplates((prev) => ({ ...prev, [type]: { ...prev[type], type, ...fields } }));
  }

  function handleClassSaved(updated: VendorCalendarClass) {
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleClassAdded(created: VendorCalendarClass) {
    setClasses((prev) =>
      [...prev, created].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    );
  }

  async function handleCancelClass(cls: VendorCalendarClass) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Cancel the class on ${new Date(cls.start_time).toLocaleDateString()}? This removes it from your schedule.`)
    ) {
      return;
    }
    setClasses((prev) => prev.filter((c) => c.id !== cls.id));
    await fetch(`/api/dashboard/classes/${cls.id}`, { method: "DELETE" });
  }

  async function toggleTemplate(type: EmailTemplateType, next: boolean) {
    setTemplates((prev) => ({ ...prev, [type]: { ...prev[type], type, is_active: next } }));
    await fetch("/api/onboarding/email-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, type, is_active: next }),
    });
  }

  return (
    <div className="flex min-h-screen bg-white pt-[var(--header-height)]">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-gray-200 bg-[#F9FAFB] md:flex">
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 border-l-2 px-5 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-[#C1440E] bg-[#C1440E]/5 font-medium text-[#C1440E]"
                    : "border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon(active)}
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-gray-200 px-5 py-4">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, fixed tiny size
            <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C1440E]/10 text-sm font-medium text-[#C1440E]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{firstName}</p>
            <p className="truncate text-xs text-gray-500">Instructor</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          {tab === "overview" && (
            <OverviewTab
              {...props}
              classes={classes}
              templates={templates}
              onOpenReviews={() => setReviewsOpen(true)}
              onEditTemplate={setEditorType}
              onToggleTemplate={toggleTemplate}
              onEditClass={setEditingClass}
              onCancelClass={handleCancelClass}
              onAddClass={() => setAddingClass(true)}
            />
          )}
          {tab === "listing" && <ListingTab vendor={vendor} publicProfileUrl={publicProfileUrl} />}
          {tab === "classes" && (
            <ClassesPanel
              classes={classes}
              heading
              onEditClass={setEditingClass}
              onCancelClass={handleCancelClass}
              onAddClass={() => setAddingClass(true)}
            />
          )}
          {tab === "registrations" && <RegistrationsPanel registrations={props.registrations} full />}
          {tab === "emails" && (
            <EmailTemplatesPanel templates={templates} onEdit={setEditorType} onToggle={toggleTemplate} heading />
          )}
          {tab === "payments" && <PaymentsPanel vendor={vendor} payout={props.payout} heading />}
          {tab === "settings" && <SettingsTab vendor={vendor} />}
        </div>
      </main>

      <ReviewsDrawer open={reviewsOpen} onClose={() => setReviewsOpen(false)} reviews={props.reviews} />
      <ClassEditorDrawer
        open={editingClass !== null}
        onClose={() => setEditingClass(null)}
        cls={editingClass}
        onSaved={handleClassSaved}
      />
      <AddClassDrawer
        open={addingClass}
        onClose={() => setAddingClass(false)}
        classTypes={props.classTypes}
        onSaved={handleClassAdded}
      />
      <EmailEditorDrawer
        open={editorType !== null}
        onClose={() => setEditorType(null)}
        type={editorType}
        template={editorType ? templates[editorType] : undefined}
        onSaved={handleTemplateSaved}
        vendorId={vendor.id}
      />
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({
  vendor,
  firstName,
  classes,
  registrations,
  templates,
  stats,
  payout,
  publicProfileUrl,
  onOpenReviews,
  onEditTemplate,
  onToggleTemplate,
  onEditClass,
  onCancelClass,
  onAddClass,
}: Props & {
  onOpenReviews: () => void;
  onEditTemplate: (t: EmailTemplateType) => void;
  onToggleTemplate: (t: EmailTemplateType, next: boolean) => void;
  onEditClass: (cls: VendorCalendarClass) => void;
  onCancelClass: (cls: VendorCalendarClass) => void;
  onAddClass: () => void;
}) {
  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi {firstName}, here&apos;s your dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your listing, classes, and student communications.
          </p>
        </div>
        {publicProfileUrl && (
          <Link
            href={publicProfileUrl}
            target="_blank"
            className="text-sm font-medium text-[#C1440E] hover:underline"
          >
            Preview my listing →
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Registrations" sublabel="via CarryClass" value={stats.totalRegistrations} />
        <StatCard label="This Month" value={stats.registrationsThisMonth} />
        <StatCard label="Upcoming Classes" value={classes.length} />
        <ReviewsStatCard count={stats.totalReviews} onClick={onOpenReviews} />
      </div>

      <ClassesPanel classes={classes} onEditClass={onEditClass} onCancelClass={onCancelClass} onAddClass={onAddClass} />
      <RecentRegistrationsPanel registrations={registrations} />
      <EmailTemplatesPanel templates={templates} onEdit={onEditTemplate} onToggle={onToggleTemplate} />
      <PaymentsPanel vendor={vendor} payout={payout} />
    </div>
  );
}

function StatCard({ label, sublabel, value }: { label: string; sublabel?: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
      {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}

function ReviewsStatCard({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-gray-200 p-5 text-left transition-colors hover:border-[#C1440E] hover:bg-[#C1440E]/5"
    >
      {count > 0 ? (
        <>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Total Reviews</p>
          <p className="text-xs text-[#C1440E]">via CarryClass · View all →</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900">No reviews yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Reviews appear after students complete a class
          </p>
        </>
      )}
    </button>
  );
}

// ── Classes & Schedule ──────────────────────────────────────────────────────

function statusPill(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700"
    : "bg-gray-100 text-gray-500";
}

function ClassesPanel({
  classes,
  heading,
  onEditClass,
  onCancelClass,
  onAddClass,
}: {
  classes: VendorCalendarClass[];
  heading?: boolean;
  onEditClass: (cls: VendorCalendarClass) => void;
  onCancelClass: (cls: VendorCalendarClass) => void;
  onAddClass: () => void;
}) {
  return (
    <section className="rounded-lg border border-gray-200 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className={heading ? "text-lg font-semibold text-gray-900" : "text-sm font-semibold text-gray-900"}>
          Classes &amp; Schedule
        </h2>
        <button
          type="button"
          onClick={onAddClass}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium !text-white hover:bg-black transition-colors"
        >
          Add Class
        </button>
      </div>

      {classes.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No upcoming classes.{" "}
          <button
            type="button"
            onClick={onAddClass}
            className="font-medium text-[#C1440E] hover:underline"
          >
            Add your first →
          </button>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="py-3 pr-4 whitespace-nowrap">Date</th>
                <th className="py-3 pr-4 whitespace-nowrap">Time</th>
                <th className="py-3 pr-4 w-44">Location</th>
                <th className="py-3 pr-4">Class type</th>
                <th className="py-3 pr-4">Spots</th>
                <th className="py-3 pr-4">Schedule</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 w-10" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 pr-4 font-medium text-gray-900 whitespace-nowrap">{formatLongDate(c.start_time)}</td>
                  <td className="py-4 pr-4 text-gray-600 whitespace-nowrap">{formatTime(c.start_time)}</td>
                  <td className="py-4 pr-4 text-gray-600">
                    <span className="block max-w-44 line-clamp-2" title={c.location || undefined}>
                      {c.location || "—"}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-gray-600">
                    {c.class_type ? CLASS_TYPE_LABELS[c.class_type] ?? c.class_type : "—"}
                  </td>
                  <td className="py-4 pr-4 text-gray-600">{c.max_students ?? "—"}</td>
                  <td className="py-4 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.is_recurring ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.is_recurring ? "Recurring" : "One-time"}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(c.is_active)}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <ClassRowMenu
                      onEdit={() => onEditClass(c)}
                      onCancel={() => onCancelClass(c)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClassRowMenu({ onEdit, onCancel }: { onEdit: () => void; onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Class actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: coords.top, right: coords.right }}
            className="z-[60] w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit class
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Cancel class
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

// ── Registrations ────────────────────────────────────────────────────────────

function paymentPill(status: string) {
  const s = status.toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700";
  if (s === "PENDING") return "bg-amber-50 text-amber-700";
  if (s === "REFUNDED") return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-500";
}

function RecentRegistrationsPanel({ registrations }: { registrations: DashboardRegistration[] }) {
  const recent = registrations.slice(0, 5);
  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Recent Registrations</h2>
      {recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No registrations yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{formatStudentName(r.customerName)}</p>
                  <p className="text-xs text-gray-500">
                    Class {formatShortDate(r.classDate)} · Registered {formatShortDate(r.registeredOn)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${paymentPill(r.status)}`}>
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
          {registrations.length > recent.length && (
            <p className="mt-3 text-right text-xs text-gray-400">
              Showing {recent.length} of {registrations.length}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function RegistrationsPanel({ registrations, full }: { registrations: DashboardRegistration[]; full?: boolean }) {
  return (
    <section className={full ? "" : "rounded-lg border border-gray-200 p-5"}>
      {full && <h1 className="mb-6 text-2xl font-bold text-gray-900">Registrations</h1>}
      <div className="rounded-lg border border-gray-200 p-5">
        {registrations.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No registrations yet. They&apos;ll appear here when students book through CarryClass.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Class Date</th>
                  <th className="py-2 pr-4">Registered On</th>
                  <th className="py-2">Payment Status</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 text-gray-900">{formatStudentName(r.customerName)}</td>
                    <td className="py-3 pr-4 text-gray-600">{formatLongDate(r.classDate)}</td>
                    <td className="py-3 pr-4 text-gray-600">{formatLongDate(r.registeredOn)}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentPill(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Email templates ──────────────────────────────────────────────────────────

function EmailTemplatesPanel({
  templates,
  onEdit,
  onToggle,
  heading,
}: {
  templates: Record<string, Partial<VendorEmailTemplate>>;
  onEdit: (t: EmailTemplateType) => void;
  onToggle: (t: EmailTemplateType, next: boolean) => void;
  heading?: boolean;
}) {
  return (
    <section>
      <h2 className={heading ? "mb-4 text-2xl font-bold text-gray-900" : "mb-4 text-sm font-semibold text-gray-900"}>
        Email Templates
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {TEMPLATE_META.map(({ type, name, defaultTiming }) => {
          const t = templates[type];
          const isConfirmation = type === "confirmation";
          const active = isConfirmation ? true : t?.is_active ?? true;
          const timingLabel = isConfirmation
            ? defaultTiming
            : TIMING_LABELS[t?.send_timing ?? ""] ?? defaultTiming;
          const subject = t?.subject?.trim() || "No subject set yet";
          const body = t?.body?.trim() || "No content yet — click Edit to write this email.";
          return (
            <div key={type} className="flex flex-col rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                {isConfirmation ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Always on</span>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={`Toggle ${name}`}
                    onClick={() => onToggle(type, !active)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      active ? "bg-[#C1440E]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        active ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">{timingLabel}</p>
              <p className="mt-3 truncate text-sm font-medium text-gray-700">{subject}</p>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{body}</p>
              <button
                type="button"
                onClick={() => onEdit(type)}
                className="mt-4 self-start rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Payments ─────────────────────────────────────────────────────────────────

function PaymentsPanel({
  vendor,
  payout,
  heading,
}: {
  vendor: VendorProfile;
  payout: DashboardPayout;
  heading?: boolean;
}) {
  const connected = Boolean(vendor.stripe_account_id) || payout.connected;
  return (
    <section className="rounded-lg border border-gray-200 p-5">
      <h2 className={heading ? "mb-4 text-lg font-semibold text-gray-900" : "mb-4 text-sm font-semibold text-gray-900"}>
        Payments
      </h2>
      {connected ? (
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Stripe connected ✓
          </span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400">Last payout</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(payout.lastAmountCents)}</p>
              <p className="text-xs text-gray-500">{formatLongDate(payout.lastPayoutDate)}</p>
            </div>
            {/* TODO: build a paginated payout history view consuming /api/dashboard/payouts. */}
            <Link href="/dashboard/vendor#payouts" className="text-sm font-medium text-[#C1440E] hover:underline">
              View payout history →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect Stripe to accept paid bookings from students.
          </p>
          <Link
            href="/onboard/step/5"
            className="inline-block rounded-lg bg-[#C1440E] px-4 py-2 text-sm font-medium text-white hover:bg-[#a53a0c] transition-colors"
          >
            Connect Stripe →
          </Link>
        </div>
      )}
    </section>
  );
}

// ── My Listing ───────────────────────────────────────────────────────────────

function ListingTab({ vendor, publicProfileUrl }: { vendor: VendorProfile; publicProfileUrl: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Listing</h1>
        {publicProfileUrl && (
          <Link href={publicProfileUrl} target="_blank" className="text-sm font-medium text-[#C1440E] hover:underline">
            Preview my listing →
          </Link>
        )}
      </div>
      <section className="rounded-lg border border-gray-200 p-5">
        <p className="text-sm font-medium text-gray-900">{vendor.name ?? "Your listing"}</p>
        {vendor.county && <p className="mt-1 text-sm text-gray-600">{vendor.county}</p>}
        {vendor.bio && <p className="mt-3 text-sm leading-relaxed text-gray-600">{vendor.bio}</p>}
        <Link
          href="/onboard/step/1"
          className="mt-4 inline-block rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit profile
        </Link>
      </section>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function SettingsTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <section className="rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Business name</dt>
            <dd className="text-gray-900">{vendor.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{vendor.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Phone</dt>
            <dd className="text-gray-900">{vendor.phone ?? "—"}</dd>
          </div>
        </dl>
        <Link
          href="/onboard/step/1"
          className="mt-4 inline-block rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit account details
        </Link>
      </section>
    </div>
  );
}
