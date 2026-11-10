"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import type { VendorProfile, VendorCalendarClass, VendorClassType, VendorCheckoutFee, VendorEmailTemplate } from "@/lib/onboarding-db";

type DashboardClass = VendorCalendarClass & { registrationCount?: number };
import type {
  DashboardReview,
  DashboardRegistration,
  DashboardStats,
  DashboardPayout,
  DashboardEmailMetrics,
} from "@/lib/dashboard-db";
import { ReviewsDrawer } from "./ReviewsDrawer";
import { EmailEditorPanel, type EmailTemplateType } from "./EmailEditorDrawer";
import { ClassEditorDrawer } from "./ClassEditorDrawer";
import { AddClassDrawer } from "./AddClassDrawer";
import { RegistrationsCrm, registrationsForDisplay } from "./RegistrationsCrm";
import { isCustomClassKey } from "@/lib/instructor-catalog";
import { CheckoutFeesForm } from "@/components/onboarding/CheckoutFeesEditor";
import { PaymentsDashboard } from "./payments/PaymentsDashboard";
import {
  ConnectStripeBanner,
  ConnectStripeNotice,
  STRIPE_CONNECT_HREF,
} from "./ConnectStripePrompt";
import { Step1Profile } from "@/components/onboarding/Step1Profile";
import { Step2ClassTypes } from "@/components/onboarding/Step2ClassTypes";
import { Step4Cancellation } from "@/components/onboarding/Step4Cancellation";
import {
  formatLongDate,
  formatShortDate,
  formatTime,
  formatCurrency,
  sentenceCase,
} from "./dashboard-format";
import {
  dashboardFont,
  avatarTone,
  initials,
  DASH_PAGE_BG,
  DASH_SIDEBAR_BG,
  DASH_INK,
  DASH_MUTED,
  DASH_SUBTLE,
  DASH_BORDER,
  DASH_DIVIDE,
  DASH_CARD,
  DASH_SOFT_PANEL,
  DASH_EYEBROW,
  DASH_HERO_TITLE,
  DASH_PAGE_TITLE,
  DASH_SECTION_TITLE,
  DASH_SUBSECTION_TITLE,
  DASH_CARD_TITLE,
  DASH_TABLE_HEAD,
  DASH_LINK,
  DASH_BTN_PRIMARY,
  DASH_BTN_DARK,
  DASH_BTN_SECONDARY,
  DASH_BTN_DANGER,
  DASH_PILL,
  DASH_PILL_SUCCESS,
  DASH_PILL_ACCENT,
  DASH_PILL_NEUTRAL,
  DASH_PILL_INFO,
  DASH_INPUT,
  DASH_SWITCH_ON,
  DASH_SWITCH_OFF,
} from "./dashboard-theme";
import { describeStoredRecurrence } from "@/lib/expand-recurrence";
import {
  applyMergeTags,
  emailBodyToHtml,
  emailPreviewMergeValues,
  resolveTemplateContent,
  type EmailPreviewContext,
} from "@/lib/email-templates-defaults";

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

const LISTING_SUBSECTIONS: { id: string; label: string }[] = [
  { id: "listing-basic", label: "General Information" },
  { id: "listing-counties", label: "Counties you serve" },
  { id: "listing-description", label: "Public description" },
  { id: "listing-certifications", label: "Certifications & specializations" },
  { id: "listing-photos", label: "Photos" },
  { id: "listing-what-to-bring", label: "What to bring" },
  { id: "listing-class-types", label: "Class types & pricing" },
  { id: "listing-fees", label: "Checkout fees" },
  { id: "listing-cancellation", label: "Cancellation policy" },
];

function NavIcon({ active, path }: { active: boolean; path: string }) {
  return (
    <svg
      className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#1F1B16]" : DASH_SUBTLE}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

function classTypeLabel(
  type: string | null | undefined,
  classTypes?: VendorClassType[]
): string {
  if (!type) return "—";
  if (CLASS_TYPE_LABELS[type]) return CLASS_TYPE_LABELS[type];
  const named = classTypes?.find((ct) => ct.class_type === type)?.display_name?.trim();
  return named || "Other class";
}

const CLASS_TYPE_SHORT_LABELS: Record<string, string> = {
  initial: "Initial CCW",
  renewal: "CCW Renewal",
  add_a_gun: "Add a Gun",
};

function classTypeShortLabel(
  type: string | null | undefined,
  classTypes?: VendorClassType[],
  fallbackTitle?: string | null
): string {
  if (type && CLASS_TYPE_SHORT_LABELS[type]) return CLASS_TYPE_SHORT_LABELS[type];
  const named = classTypes?.find((ct) => ct.class_type === type)?.display_name?.trim();
  return named || fallbackTitle?.trim() || "Other class";
}

/** "Sat, Nov 7" */
function formatDayDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Orange County, California" from a county name or slug. */
function vendorLocationLabel(county: string | null): string | null {
  const name = county
    ?.trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+county$/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return name ? `${name} County, California` : null;
}

function feeClassOptions(classTypes: VendorClassType[]) {
  return [
    { key: "initial", label: "CCW Initial" },
    { key: "renewal", label: "CCW Renewal" },
    { key: "add_a_gun", label: "Add-A-Gun" },
    ...classTypes
      .filter((ct) => isCustomClassKey(ct.class_type))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((ct) => ({ key: ct.class_type, label: ct.display_name?.trim() || "Other class" })),
  ];
}

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
  classes: DashboardClass[];
  classTypes: VendorClassType[];
  checkoutFees: VendorCheckoutFee[];
  registrations: DashboardRegistration[];
  reviews: DashboardReview[];
  templates: Record<string, Partial<VendorEmailTemplate>>;
  stats: DashboardStats;
  payout: DashboardPayout;
  emailMetrics: DashboardEmailMetrics;
  publicProfileUrl: string | null;
  /** Surfaced from `?stripe_error=` after a failed Connect round-trip. */
  stripeError?: string | null;
}

export function VendorDashboard(props: Props) {
  const { firstName, publicProfileUrl } = props;
  const { user } = useUser();
  const [tab, setTab] = useState<TabId>("overview");
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [editorType, setEditorType] = useState<EmailTemplateType | null>(null);
  const [templates, setTemplates] = useState(props.templates);
  const [classes, setClasses] = useState(props.classes);
  const [classTypes, setClassTypes] = useState(props.classTypes);
  const [checkoutFees, setCheckoutFees] = useState(props.checkoutFees);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [vendor, setVendor] = useState(props.vendor);
  const [editingClass, setEditingClass] = useState<VendorCalendarClass | null>(null);
  const [addingClass, setAddingClass] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(LISTING_SUBSECTIONS[0].id);
  const bookingsEnabled = Boolean(vendor.stripe_account_id);
  const [focusPayouts, setFocusPayouts] = useState(false);
  const emailPreview: EmailPreviewContext = {
    vendorName: vendor.name ?? vendor.canonical_name,
    vendorEmail: vendor.email,
    instructorName:
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || firstName,
    whatToBringUrl: publicProfileUrl ? `${publicProfileUrl}?tab=what-to-bring` : null,
  };
  const handlePayoutsFocused = useCallback(() => setFocusPayouts(false), []);

  // Scroll-spy: highlight the listing subsection currently in view.
  useEffect(() => {
    if (tab !== "listing") return;
    const els = LISTING_SUBSECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tab]);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  }

  useEffect(() => {
    if (tab !== "listing" || !pendingSection) return;
    const id = pendingSection;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
      setPendingSection(null);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [tab, pendingSection]);

  function openCheckoutFees() {
    setPendingSection("listing-fees");
    setTab("listing");
  }

  function handleTemplateSaved(type: EmailTemplateType, fields: Partial<VendorEmailTemplate>) {
    setTemplates((prev) => ({ ...prev, [type]: { ...prev[type], type, ...fields } }));
  }

  function handleProfileSaved(updated: VendorProfile) {
    setVendor(updated);
  }

  function handleClassTypesSaved(updated: VendorClassType[]) {
    setClassTypes(updated);
  }

  function handleCancellationSaved(fields: {
    cancellation_policy: string;
    cancellation_hours: number | null;
    cancellation_refund_percent: number | null;
  }) {
    setVendor((prev) => ({ ...prev, ...fields }));
  }

  function openEmailEditor(type: EmailTemplateType) {
    setEditorType(type);
    setTab("emails");
  }

  function handleClassSaved(updated: VendorCalendarClass) {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === updated.id ? { ...c, ...updated, registrationCount: c.registrationCount } : c
      )
    );
  }

  function handleClassAdded(created: VendorCalendarClass, updatedTypes: VendorClassType[]) {
    setClasses((prev) =>
      [...prev, { ...created, registrationCount: 0 }].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    );
    if (updatedTypes.length > 0) setClassTypes(updatedTypes);
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
    if (type === "confirmation") return; // always on — content is editable, delivery is not
    setTemplates((prev) => ({ ...prev, [type]: { ...prev[type], type, is_active: next } }));
    await fetch("/api/onboarding/email-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, type, is_active: next }),
    });
  }

  return (
    <div
      className={`${dashboardFont.className} flex min-h-screen pt-[var(--header-height)] text-[#1F1B16] antialiased ${DASH_PAGE_BG}`}
    >
      {/* Sidebar (desktop) */}
      <aside
        className={`sticky top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[232px] shrink-0 flex-col self-start overflow-y-auto md:flex ${DASH_SIDEBAR_BG}`}
      >
        <nav className="flex-1 space-y-0.5 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const active = tab === item.id;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C1440E] ${
                    active
                      ? "bg-[#C1440E]/8 font-medium text-[#1F1B16]"
                      : "text-[#6B645B] hover:bg-[#F1ECE5] hover:text-[#1F1B16]"
                  }`}
                >
                  {item.icon(active)}
                  <span>{item.label}</span>
                </button>
                {item.id === "listing" && active && (
                  <ul className={`!mb-1 !ml-[22px] !mt-1 !block !p-0 border-l ${DASH_BORDER}`}>
                    {LISTING_SUBSECTIONS.map((sub) => {
                      const subActive = activeSection === sub.id;
                      return (
                        <li key={sub.id}>
                          <button
                            type="button"
                            onClick={() => scrollToSection(sub.id)}
                            className={`-ml-px flex w-full items-center border-l py-1.5 pl-3 pr-1 text-left text-[13px] leading-snug transition-colors ${
                              subActive
                                ? "border-[#C1440E] font-medium text-[#1F1B16]"
                                : "border-transparent text-[#7A7268] hover:text-[#1F1B16]"
                            }`}
                          >
                            {sub.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className={`mx-3 flex items-center gap-3 border-t px-2 py-4 ${DASH_BORDER}`}>
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar, fixed tiny size
            <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C1440E] text-sm font-semibold text-white">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className={`!m-0 truncate text-sm font-medium leading-tight ${DASH_INK}`}>{firstName}</p>
            <p className={`!m-0 truncate text-xs leading-tight ${DASH_MUTED}`}>Instructor</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-2 sm:p-3 md:p-4">
        <div className="min-h-full rounded-2xl bg-white shadow-[0_1px_2px_rgba(31,27,22,0.04),0_10px_30px_-12px_rgba(31,27,22,0.10)] ring-1 ring-[#ECE7E0]">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          {!bookingsEnabled && (
            <div className="mb-6">
              <ConnectStripeBanner error={props.stripeError} />
            </div>
          )}
          {tab === "overview" && (
            <OverviewTab
              {...props}
              vendor={vendor}
              classes={classes}
              templates={templates}
              onOpenReviews={() => setReviewsOpen(true)}
              onEditTemplate={openEmailEditor}
              onToggleTemplate={toggleTemplate}
              emailPreview={emailPreview}
              onEditClass={setEditingClass}
              onCancelClass={handleCancelClass}
              onAddClass={() => setAddingClass(true)}
              onViewAllRegistrations={() => setTab("registrations")}
              onViewPayoutHistory={() => {
                setFocusPayouts(true);
                setTab("payments");
              }}
            />
          )}
          {tab === "listing" && (
            <ListingTab
              vendor={vendor}
              classTypes={classTypes}
              checkoutFees={checkoutFees}
              publicProfileUrl={publicProfileUrl}
              onProfileSaved={handleProfileSaved}
              onClassTypesSaved={handleClassTypesSaved}
              onFeesSaved={setCheckoutFees}
              onCancellationSaved={handleCancellationSaved}
            />
          )}
          {tab === "classes" && (
            <ClassesPanel
              classes={classes}
              classTypes={classTypes}
              heading
              bookingsEnabled={bookingsEnabled}
              onEditClass={setEditingClass}
              onCancelClass={handleCancelClass}
              onAddClass={() => setAddingClass(true)}
            />
          )}
          {tab === "registrations" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total registrations"
                  sublabel="via CarryClass"
                  value={props.stats.totalRegistrations}
                />
                <StatCard label="This month" value={props.stats.registrationsThisMonth} />
                <StatCard label="Upcoming classes" value={classes.length} />
              </div>
              <RegistrationsCrm registrations={props.registrations} classTypes={classTypes} />
            </div>
          )}
          {tab === "emails" &&
            (editorType ? (
              <EmailEditorPanel
                type={editorType}
                template={templates[editorType]}
                onClose={() => setEditorType(null)}
                onSaved={handleTemplateSaved}
                vendorId={vendor.id}
                vendorEmail={emailPreview.vendorEmail}
                vendorName={emailPreview.vendorName}
                instructorName={emailPreview.instructorName}
                whatToBringUrl={emailPreview.whatToBringUrl}
              />
            ) : (
              <div className="space-y-8">
                <BookingNotificationsPanel vendor={vendor} onSaved={handleProfileSaved} />
                <EmailTemplatesPanel
                  templates={templates}
                  onEdit={openEmailEditor}
                  onToggle={toggleTemplate}
                  heading
                  metrics={props.emailMetrics}
                  preview={emailPreview}
                />
              </div>
            ))}
          {tab === "payments" && (
            <PaymentsTab
              vendor={vendor}
              payout={props.payout}
              checkoutFees={checkoutFees}
              onEditFees={openCheckoutFees}
              onVendorChange={setVendor}
              focusPayouts={focusPayouts}
              onFocusHandled={handlePayoutsFocused}
            />
          )}
          {tab === "settings" && (
            <SettingsTab vendor={vendor} onVendorSaved={handleProfileSaved} />
          )}
        </div>
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
        classTypes={classTypes}
        onSaved={handleClassAdded}
      />
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({
  vendor,
  firstName,
  classes,
  classTypes,
  registrations,
  templates,
  stats,
  payout,
  publicProfileUrl,
  onOpenReviews,
  onEditTemplate,
  onToggleTemplate,
  emailPreview,
  onEditClass,
  onCancelClass,
  onAddClass,
  onViewAllRegistrations,
  onViewPayoutHistory,
}: Props & {
  onViewPayoutHistory: () => void;
  onViewAllRegistrations: () => void;
  onOpenReviews: () => void;
  onEditTemplate: (t: EmailTemplateType) => void;
  onToggleTemplate: (t: EmailTemplateType, next: boolean) => void;
  emailPreview: EmailPreviewContext;
  onEditClass: (cls: VendorCalendarClass) => void;
  onCancelClass: (cls: VendorCalendarClass) => void;
  onAddClass: () => void;
}) {
  const vendorName = vendor.name ?? vendor.canonical_name;
  const location = vendorLocationLabel(vendor.county);
  const nextClass = classes[0];

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={DASH_EYEBROW}>Instructor dashboard</p>
          <h1 className={`mt-2 ${DASH_HERO_TITLE}`}>Welcome back, {firstName}</h1>
          <p className={`!mb-0 !mt-1.5 text-sm ${DASH_MUTED}`}>
            {location
              ? `${vendorName} · ${location}`
              : "Manage your listing, classes, and student communications."}
          </p>
        </div>
        {publicProfileUrl && (
          <Link href={publicProfileUrl} target="_blank" className={`mt-0.5 ${DASH_LINK}`}>
            Preview my listing →
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total registrations" sublabel="via CarryClass" value={stats.totalRegistrations} />
          <StatCard label="This month" value={stats.registrationsThisMonth} />
          <StatCard
            label="Upcoming classes"
            sublabel={nextClass ? `Next: ${formatDayDate(nextClass.start_time)}` : undefined}
            value={classes.length}
          />
          <ReviewsStatCard count={stats.totalReviews} onClick={onOpenReviews} />
        </div>

        {nextClass && <NextClassCard cls={nextClass} classTypes={classTypes} />}
      </div>

      <ClassesPanel
        classes={classes}
        classTypes={classTypes}
        bookingsEnabled={Boolean(vendor.stripe_account_id)}
        onEditClass={onEditClass}
        onCancelClass={onCancelClass}
        onAddClass={onAddClass}
      />
      <RecentRegistrationsPanel
        registrations={registrationsForDisplay(registrations)}
        classTypes={classTypes}
        onViewAll={onViewAllRegistrations}
      />
      <EmailTemplatesPanel
        templates={templates}
        onEdit={onEditTemplate}
        onToggle={onToggleTemplate}
        preview={emailPreview}
      />
      <PaymentsPanel vendor={vendor} payout={payout} onViewPayoutHistory={onViewPayoutHistory} />
    </div>
  );
}

function PaymentsTab({
  vendor,
  payout,
  checkoutFees,
  onEditFees,
  onVendorChange,
  focusPayouts,
  onFocusHandled,
}: {
  vendor: VendorProfile;
  payout: DashboardPayout;
  checkoutFees: VendorCheckoutFee[];
  onEditFees: () => void;
  onVendorChange: (vendor: VendorProfile) => void;
  focusPayouts: boolean;
  onFocusHandled: () => void;
}) {
  return (
    <PaymentsDashboard
      key={vendor.stripe_account_id ?? "disconnected"}
      stripeAccountId={vendor.stripe_account_id}
      fallbackPayout={payout}
      checkoutFees={checkoutFees}
      onEditFees={onEditFees}
      focusPayouts={focusPayouts}
      onFocusHandled={onFocusHandled}
      connectionPanel={
        <PaymentsPanel
          vendor={vendor}
          payout={payout}
          onVendorChange={onVendorChange}
          showConnectionControls
          heading
        />
      }
    />
  );
}

function StatValue({ value }: { value: number }) {
  return (
    <div className={`text-3xl font-bold leading-none tracking-tight tabular-nums ${DASH_INK}`}>{value}</div>
  );
}

function StatCard({ label, sublabel, value }: { label: string; sublabel?: string; value: number }) {
  return (
    <div className={`${DASH_CARD} p-5`}>
      <StatValue value={value} />
      <div className={`mt-3 text-sm font-medium ${DASH_INK}`}>{label}</div>
      {sublabel && <div className={`mt-0.5 text-xs ${DASH_MUTED}`}>{sublabel}</div>}
    </div>
  );
}

function ReviewsStatCard({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${DASH_CARD} !bg-white p-5 text-left transition-all hover:-translate-y-px hover:border-[#C1440E]/40 hover:shadow-[0_6px_18px_-10px_rgba(193,68,14,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1440E]`}
    >
      {count > 0 ? (
        <>
          <StatValue value={count} />
          <div className={`mt-3 text-sm font-medium ${DASH_INK}`}>Total reviews</div>
          <div className="mt-0.5 text-xs text-[#A93B0C]">via CarryClass · View all →</div>
        </>
      ) : (
        <>
          <div className={`text-sm font-medium ${DASH_INK}`}>No reviews yet</div>
          <div className={`mt-1 text-xs ${DASH_MUTED}`}>
            Reviews appear after students complete a class
          </div>
        </>
      )}
    </button>
  );
}

function NextClassCard({ cls, classTypes }: { cls: DashboardClass; classTypes: VendorClassType[] }) {
  const hours = Math.round(
    (new Date(cls.end_time).getTime() - new Date(cls.start_time).getTime()) / 3_600_000
  );
  const title = [
    formatDayDate(cls.start_time),
    classTypeShortLabel(cls.class_type, classTypes, cls.title),
    Number.isFinite(hours) && hours > 0 ? `${hours} hr` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const seatsLeft =
    cls.max_students != null ? Math.max(cls.max_students - (cls.registrationCount ?? 0), 0) : null;
  const detail = [
    formatTime(cls.start_time),
    cls.location?.trim() || null,
    seatsLeft != null ? `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`${DASH_CARD} flex items-center justify-between gap-4 px-5 py-4`}>
      <div className="min-w-0">
        <div className={`truncate text-sm font-semibold ${DASH_INK}`}>
          <span className="sr-only">Next class: </span>
          {title}
        </div>
        <div className={`mt-0.5 truncate text-xs ${DASH_MUTED}`}>{detail}</div>
      </div>
      {cls.price != null && (
        <span className={`${DASH_PILL} ${DASH_PILL_ACCENT} font-semibold`}>
          {formatCurrency(Math.round(cls.price * 100)).replace(/\.00$/, "")}
        </span>
      )}
    </div>
  );
}

// ── Classes & Schedule ──────────────────────────────────────────────────────

function statusPill(active: boolean) {
  return active ? DASH_PILL_SUCCESS : DASH_PILL_NEUTRAL;
}

function ClassesPanel({
  classes,
  classTypes = [],
  heading,
  bookingsEnabled,
  onEditClass,
  onCancelClass,
  onAddClass,
}: {
  classes: DashboardClass[];
  classTypes?: VendorClassType[];
  heading?: boolean;
  bookingsEnabled: boolean;
  onEditClass: (cls: VendorCalendarClass) => void;
  onCancelClass: (cls: VendorCalendarClass) => void;
  onAddClass: () => void;
}) {
  return (
    <section>
      <div className={`flex items-center justify-between gap-3 ${heading ? "mb-5" : "mb-3"}`}>
        <h2 className={heading ? DASH_PAGE_TITLE : DASH_SECTION_TITLE}>Classes &amp; schedule</h2>
        <button type="button" onClick={onAddClass} className={heading ? DASH_BTN_PRIMARY : `${DASH_BTN_PRIMARY} !px-3 !py-1.5`}>
          Add class
        </button>
      </div>

      {!bookingsEnabled && (
        <ConnectStripeNotice
          className="mb-4"
          title="These classes aren't bookable yet"
          body="Your schedule shows on your listing, but students can't reserve a seat or pay online until you connect Stripe."
        />
      )}

      <div className={DASH_CARD}>
        {classes.length === 0 ? (
          <p className={`!m-0 px-5 py-10 text-center text-sm ${DASH_MUTED}`}>
            No upcoming classes.{" "}
            <button type="button" onClick={onAddClass} className={DASH_LINK}>
              Add your first →
            </button>
          </p>
        ) : (
          <div className="overflow-x-auto px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${DASH_BORDER} ${DASH_TABLE_HEAD}`}>
                  <th className="!py-3 !pr-4 font-medium whitespace-nowrap">Date</th>
                  <th className="!py-3 !pr-4 font-medium whitespace-nowrap">Time</th>
                  <th className="!py-3 !pr-4 w-44 font-medium">Location</th>
                  <th className="!py-3 !pr-4 font-medium">Class type</th>
                  <th className="!py-3 !pr-4 font-medium">Spots</th>
                  <th className="!py-3 !pr-4 font-medium">Registrations</th>
                  <th className="!py-3 !pr-4 font-medium">Status</th>
                  <th className="!py-3 w-10" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className={DASH_DIVIDE}>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td className={`!py-4 !pr-4 align-top font-medium leading-snug whitespace-nowrap ${DASH_INK}`}>
                      {formatLongDate(c.start_time)}
                      {c.is_recurring ? (
                        <span className={`mt-0.5 block text-xs font-normal ${DASH_MUTED}`}>
                          {describeStoredRecurrence(c.recurrence_rule)}
                        </span>
                      ) : null}
                    </td>
                    <td className="!py-4 !pr-4 align-top leading-snug text-[#5C554C] whitespace-nowrap">{formatTime(c.start_time)}</td>
                    <td className="!py-4 !pr-4 align-top text-[#5C554C]">
                      <span className="block max-w-44 leading-snug line-clamp-2" title={c.location || undefined}>
                        {c.location || "—"}
                      </span>
                    </td>
                    <td className="!py-4 !pr-4 align-top leading-snug text-[#5C554C]">
                      {classTypeLabel(c.class_type, classTypes)}
                    </td>
                    <td className="!py-4 !pr-4 align-top leading-snug tabular-nums text-[#5C554C]">{c.max_students ?? "—"}</td>
                    <td className="!py-4 !pr-4 align-top leading-snug tabular-nums text-[#5C554C]">{c.registrationCount ?? 0}</td>
                    <td className="!py-4 !pr-4 align-top">
                      <span className={`${DASH_PILL} ${statusPill(c.is_active)}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="!py-3 align-top text-right">
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
      </div>
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
        className="rounded-md !bg-transparent p-1.5 text-[#A39B91] transition-colors hover:!bg-[#F1ECE5] hover:text-[#1F1B16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C1440E]"
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
            className={`${dashboardFont.className} z-[60] w-40 overflow-hidden rounded-xl border bg-white p-1 shadow-[0_12px_32px_-12px_rgba(31,27,22,0.25)] ${DASH_BORDER}`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="block w-full rounded-lg !bg-transparent px-3 py-2 text-left text-sm text-[#1F1B16] hover:!bg-[#F6F3EE]"
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
              className="block w-full rounded-lg !bg-transparent px-3 py-2 text-left text-sm text-red-700 hover:!bg-red-50"
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
  if (s === "PAID") return DASH_PILL_SUCCESS;
  if (s === "PENDING") return DASH_PILL_ACCENT;
  if (s === "REFUNDED") return DASH_PILL_INFO;
  return DASH_PILL_NEUTRAL;
}

function RegistrationsTable({
  registrations,
  classTypes,
}: {
  registrations: DashboardRegistration[];
  classTypes: VendorClassType[];
}) {
  if (registrations.length === 0) {
    return (
      <p className={`!m-0 px-5 py-10 text-center text-sm ${DASH_MUTED}`}>
        No registrations yet. They&apos;ll appear here when students book through CarryClass.
      </p>
    );
  }

  return (
    <ul className={`!m-0 !block !p-0 ${DASH_DIVIDE}`}>
      {registrations.map((r) => {
        const classLabel = classTypeShortLabel(r.classType, classTypes, r.classTitle);
        const contact = [r.customerEmail, r.customerPhone].filter(Boolean).join(" · ");
        return (
          <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
            <span
              aria-hidden
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarTone(r.customerName)}`}
            >
              {initials(r.customerName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={`truncate text-sm font-medium ${DASH_INK}`}>{r.customerName}</span>
                {contact && <span className={`truncate text-xs ${DASH_MUTED}`}>{contact}</span>}
              </div>
              <div className={`mt-0.5 truncate text-xs ${DASH_MUTED}`} title={classLabel}>
                {[classLabel, formatDayDate(r.classDate), formatTime(r.classDate)].join(" · ")}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`${DASH_PILL} ${paymentPill(r.status)}`}>{sentenceCase(r.status)}</span>
              <span className={`text-[11px] ${DASH_MUTED}`}>
                Booked {formatShortDate(r.registeredOn)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecentRegistrationsPanel({
  registrations,
  classTypes,
  onViewAll,
}: {
  registrations: DashboardRegistration[];
  classTypes: VendorClassType[];
  onViewAll: () => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={DASH_SECTION_TITLE}>Recent registrations</h2>
        {registrations.length > 0 && (
          <button type="button" onClick={onViewAll} className={DASH_LINK}>
            View all →
          </button>
        )}
      </div>
      <div className={DASH_CARD}>
        <RegistrationsTable registrations={registrations.slice(0, 8)} classTypes={classTypes} />
      </div>
    </section>
  );
}

// ── Email templates ──────────────────────────────────────────────────────────

/** Human-readable send-timing summary for a template card. */
function timingSummary(
  type: EmailTemplateType,
  t: Partial<VendorEmailTemplate> | undefined,
  defaultTiming: string
): string {
  if (type === "confirmation") return defaultTiming;
  if (t?.send_mode === "scheduled" && t?.scheduled_at) {
    const d = new Date(t.scheduled_at);
    if (!Number.isNaN(d.getTime())) {
      return `Scheduled ${d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    }
  }
  return TIMING_LABELS[t?.send_timing ?? ""] ?? defaultTiming;
}

/** A single inline stat for the per-email metric row on a card. */
function EmailCardStat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-sm font-semibold tabular-nums ${DASH_INK}`}>{value}</span>
      <span className={`text-[11px] font-medium uppercase tracking-wider ${DASH_MUTED}`}>{label}</span>
      {note && <span className={`text-[11px] ${DASH_MUTED}`}>{note}</span>}
    </div>
  );
}

/** Clipped sample of the email a student would receive, plus the action that opens it. */
function EmailCardPreview({
  name,
  subject,
  html,
  muted,
  onOpen,
}: {
  name: string;
  subject: string;
  html: string;
  muted?: boolean;
  onOpen: () => void;
}) {
  return (
    <div className={`flex w-full shrink-0 flex-col items-stretch gap-3 lg:w-[380px] ${muted ? "opacity-60" : ""}`}>
      <div className="group relative h-[240px] overflow-hidden rounded-xl bg-white text-left shadow-[0_1px_2px_rgba(31,27,22,0.04),0_8px_24px_-8px_rgba(31,27,22,0.14)] ring-1 ring-[#ECE7E0] transition-shadow hover:shadow-[0_1px_2px_rgba(31,27,22,0.05),0_14px_32px_-10px_rgba(31,27,22,0.20)]">
        <div className="pointer-events-none h-full overflow-hidden px-4 pt-3.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${DASH_MUTED}`}>Preview</span>
          <p className={`!mb-0 !mt-1 line-clamp-2 text-[13px] font-semibold leading-snug ${DASH_INK}`}>
            {subject || "(no subject)"}
          </p>
          <div className="my-2.5 h-px bg-[#F1ECE5]" />
          <div
            className="text-xs leading-relaxed text-[#5C554C] [&_a]:!text-[#C1440E] [&_div]:!text-xs [&_div]:!leading-relaxed [&_p]:!mb-2.5 [&_p]:!mt-0 [&_p]:!text-xs [&_p]:!leading-relaxed [&_p]:!text-[#5C554C] [&_strong]:font-semibold [&_strong]:!text-[#1F1B16]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent" />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Preview ${name}`}
          className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1440E]"
        />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className={`self-end ${DASH_BTN_DARK} !px-3 !py-1.5`}
      >
        View / Edit
      </button>
    </div>
  );
}

function EmailTemplatesPanel({
  templates,
  onEdit,
  onToggle,
  heading,
  metrics,
  preview,
}: {
  templates: Record<string, Partial<VendorEmailTemplate>>;
  onEdit: (t: EmailTemplateType) => void;
  onToggle: (t: EmailTemplateType, next: boolean) => void;
  heading?: boolean;
  metrics?: DashboardEmailMetrics;
  preview?: EmailPreviewContext;
}) {
  const previewValues = emailPreviewMergeValues(preview);

  return (
    <section>
      <h2 className={heading ? `mb-5 ${DASH_PAGE_TITLE}` : `mb-3 ${DASH_SECTION_TITLE}`}>
        {heading ? "Emails" : "Email templates"}
      </h2>

      <div className="flex flex-col gap-4">
        {TEMPLATE_META.map(({ type, name, defaultTiming }) => {
          const t = templates[type];
          const isConfirmation = type === "confirmation";
          const active = isConfirmation ? true : t?.is_active ?? true;
          const timingLabel = timingSummary(type, t, defaultTiming);
          const typeMetrics = metrics?.byType[type];
          // Scheduled (per type) is derived from the template's send config, matching
          // the prior aggregate logic — an active template with an explicit date+time.
          const scheduled =
            !isConfirmation && t?.send_mode === "scheduled" && t?.scheduled_at && active ? 1 : 0;
          const content = resolveTemplateContent(type, t);
          const previewSubject = applyMergeTags(content.subject, previewValues);
          const previewHtml = emailBodyToHtml(applyMergeTags(content.body, previewValues));
          return (
            <div
              key={type}
              className={`${DASH_CARD} flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={DASH_CARD_TITLE}>{name}</h3>
                  {isConfirmation ? (
                    <span className={`${DASH_PILL} ${DASH_PILL_SUCCESS}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3F8A5A]" />
                      Always on
                    </span>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={`Toggle ${name}`}
                      onClick={() => onToggle(type, !active)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1440E] ${
                        active ? DASH_SWITCH_ON : DASH_SWITCH_OFF
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          active ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>
                <p className={`!mb-0 !mt-1 text-xs ${DASH_MUTED}`}>{timingLabel}</p>

                {metrics && (
                  <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2">
                    <EmailCardStat label="Sent" value={typeMetrics?.sent ?? 0} />
                    <EmailCardStat label="Scheduled" value={scheduled} />
                    <EmailCardStat
                      label="Opened"
                      value={metrics.openTrackingEnabled ? typeMetrics?.opened ?? 0 : "—"}
                      note={metrics.openTrackingEnabled ? undefined : "Not tracked yet"}
                    />
                  </div>
                )}
              </div>

              <EmailCardPreview
                name={name}
                subject={previewSubject}
                html={previewHtml}
                muted={!active}
                onOpen={() => onEdit(type)}
              />
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
  showConnectionControls,
  onVendorChange,
  onViewPayoutHistory,
}: {
  vendor: VendorProfile;
  payout: DashboardPayout;
  heading?: boolean;
  /** Full Stripe manage / switch / disconnect controls (Payments tab). */
  showConnectionControls?: boolean;
  onVendorChange?: (vendor: VendorProfile) => void;
  /** Overview card: jump to the Payments tab payout list. Defaults to scrolling in place. */
  onViewPayoutHistory?: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  // Onboarding stripe_account_id is source of truth (not payout API stale props).
  const connected = Boolean(vendor.stripe_account_id);

  async function handleDisconnect() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Disconnect Stripe? Students will no longer be able to book and pay online until you connect again. Your listing stays live."
      )
    ) {
      return;
    }

    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/stripe-connect/disconnect", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDisconnectError(data.error ?? "Could not disconnect Stripe. Please try again.");
        return;
      }
      onVendorChange?.({ ...vendor, stripe_account_id: null });
    } catch {
      setDisconnectError("Could not disconnect Stripe. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  const sectionTitle = showConnectionControls ? "Stripe & payouts" : "Payments";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className={heading ? DASH_SUBSECTION_TITLE : DASH_SECTION_TITLE}>{sectionTitle}</h2>
          {connected && (
            <span className={`${DASH_PILL} ${DASH_PILL_SUCCESS}`}>Stripe connected ✓</span>
          )}
        </div>
        {connected && (
          <button
            type="button"
            onClick={() =>
              onViewPayoutHistory
                ? onViewPayoutHistory()
                : document.getElementById("payouts")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={DASH_LINK}
          >
            View payout history →
          </button>
        )}
      </div>
      {connected ? (
        <div className="space-y-4">
          <div className={`${DASH_SOFT_PANEL} flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4`}>
            <span className="text-sm text-[#6B645B]">
              Last payout · {formatLongDate(payout.lastPayoutDate)}
            </span>
            <span className={`text-lg font-bold tracking-tight tabular-nums ${DASH_INK}`}>
              {formatCurrency(payout.lastAmountCents)}
            </span>
          </div>

          {showConnectionControls && (
            <div className={`${DASH_CARD} space-y-3 p-5 sm:p-6`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={DASH_CARD_TITLE}>Stripe connection</h3>
                {vendor.stripe_account_id && (
                  <span className={`text-xs ${DASH_MUTED}`}>Account {vendor.stripe_account_id}</span>
                )}
              </div>
              <p className="!m-0 text-sm text-[#5C554C]">
                Update bank details in Stripe, switch to a different Stripe account, or disconnect
                to turn off online bookings.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={DASH_BTN_SECONDARY}
                >
                  Manage in Stripe
                </a>
                <a href={STRIPE_CONNECT_HREF} className={DASH_BTN_SECONDARY}>
                  Switch Stripe account
                </a>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className={DASH_BTN_DANGER}
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect Stripe"}
                </button>
              </div>
              {disconnectError && (
                <p className="!m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {disconnectError}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={`${DASH_CARD} space-y-4 p-5 sm:p-6`}>
          <p className="!m-0 text-sm text-[#5C554C]">
            Connect Stripe to accept paid bookings from students. Your listing stays live either way.
          </p>
          <a href={STRIPE_CONNECT_HREF} className={DASH_BTN_PRIMARY}>
            Connect Stripe →
          </a>
        </div>
      )}
    </section>
  );
}

// ── My Listing ───────────────────────────────────────────────────────────────

function ListingTab({
  vendor,
  classTypes,
  checkoutFees,
  publicProfileUrl,
  onProfileSaved,
  onClassTypesSaved,
  onFeesSaved,
  onCancellationSaved,
}: {
  vendor: VendorProfile;
  classTypes: VendorClassType[];
  checkoutFees: VendorCheckoutFee[];
  publicProfileUrl: string | null;
  onProfileSaved: (vendor: VendorProfile) => void;
  onClassTypesSaved: (classTypes: VendorClassType[]) => void;
  onFeesSaved: (fees: VendorCheckoutFee[]) => void;
  onCancellationSaved: (fields: {
    cancellation_policy: string;
    cancellation_hours: number | null;
    cancellation_refund_percent: number | null;
  }) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={DASH_PAGE_TITLE}>My Listing</h1>
          <p className={`!mb-0 !mt-1.5 text-sm ${DASH_MUTED}`}>
            Edit everything students see on your public listing.
          </p>
        </div>
        {publicProfileUrl && (
          <Link href={publicProfileUrl} target="_blank" className={`mt-0.5 ${DASH_LINK}`}>
            Preview my listing →
          </Link>
        )}
      </div>

      <ListingSection>
        <Step1Profile vendor={vendor} mode="dashboard" onSaved={onProfileSaved} />
      </ListingSection>

      <ListingSection
        id="listing-class-types"
        title="Class types & pricing"
        description="The classes you offer and the per-student price for each."
      >
        <Step2ClassTypes
          existingTypes={classTypes}
          mode="dashboard"
          onSaved={onClassTypesSaved}
          publicSlug={vendor.slug}
          showCheckoutFees={false}
        />
      </ListingSection>

      <ListingSection
        id="listing-fees"
        title="Checkout fees"
        description="Flat fees students pay on top of the class price. You keep the full amount."
      >
        <CheckoutFeesForm
          initialFees={checkoutFees}
          classOptions={feeClassOptions(classTypes)}
          onSaved={onFeesSaved}
        />
      </ListingSection>

      <ListingSection
        id="listing-cancellation"
        title="Cancellation policy"
        description="What students agree to when they book and need to cancel."
      >
        <Step4Cancellation vendor={vendor} mode="dashboard" onSaved={onCancellationSaved} />
      </ListingSection>
    </div>
  );
}

function ListingSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-[calc(var(--header-height)+1rem)] ${DASH_CARD} p-5 sm:p-6`}
    >
      {title && <h2 className={DASH_SUBSECTION_TITLE}>{title}</h2>}
      {description && <p className={`!mb-0 !mt-1 text-sm ${DASH_MUTED}`}>{description}</p>}
      <div className={title || description ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

// ── Booking notifications (instructor alerts) ────────────────────────────────

function BookingNotificationsPanel({
  vendor,
  onSaved,
  heading = true,
}: {
  vendor: VendorProfile;
  onSaved: (vendor: VendorProfile) => void;
  heading?: boolean;
}) {
  const [enabled, setEnabled] = useState(vendor.booking_notification_enabled !== false);
  const [emailsText, setEmailsText] = useState(
    (vendor.booking_notification_emails ?? []).join(", ")
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(vendor.booking_notification_enabled !== false);
    setEmailsText((vendor.booking_notification_emails ?? []).join(", "));
  }, [vendor.booking_notification_enabled, vendor.booking_notification_emails]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/booking-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, emails: emailsText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not save notification settings."
        );
      }
      const emails = Array.isArray(data.emails)
        ? data.emails.filter((e: unknown): e is string => typeof e === "string")
        : [];
      setEmailsText(emails.join(", "));
      onSaved({
        ...vendor,
        booking_notification_enabled: data.enabled !== false,
        booking_notification_emails: emails.length ? emails : null,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notification settings.");
    } finally {
      setSaving(false);
    }
  }

  const fallback = vendor.email?.trim() || null;

  return (
    <section>
      {heading ? (
        <h2 className={`mb-5 ${DASH_PAGE_TITLE}`}>Booking notifications</h2>
      ) : (
        <h2 className={`mb-1 ${DASH_SECTION_TITLE}`}>Booking notifications</h2>
      )}
      {!heading && (
        <p className={`!mb-3 !mt-0 text-xs ${DASH_MUTED}`}>
          Email yourself when a student books online. Student confirmation emails are separate.
        </p>
      )}
      <div className={`${DASH_CARD} p-5 sm:p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={DASH_CARD_TITLE}>New booking alerts</h3>
              {enabled ? (
                <span className={`${DASH_PILL} ${DASH_PILL_SUCCESS}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3F8A5A]" />
                  On
                </span>
              ) : (
                <span className={`${DASH_PILL} ${DASH_PILL_NEUTRAL}`}>Off</span>
              )}
            </div>
            <p className={`!mb-0 !mt-1 text-xs ${DASH_MUTED}`}>
              Sent immediately when someone completes online checkout.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle new booking alerts"
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1440E] ${
              enabled ? DASH_SWITCH_ON : DASH_SWITCH_OFF
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>

        <div className={`mt-5 space-y-2 ${enabled ? "" : "opacity-60"}`}>
          <label htmlFor="booking-notification-emails" className={`block text-xs font-medium ${DASH_INK}`}>
            Send alerts to
          </label>
          <input
            id="booking-notification-emails"
            type="text"
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            disabled={!enabled}
            placeholder={fallback ?? "you@example.com"}
            className={DASH_INPUT}
          />
          <p className={`!m-0 text-xs ${DASH_MUTED}`}>
            Comma-separated, up to 5 addresses.
            {fallback
              ? ` Leave blank to use your account email (${fallback}).`
              : " Leave blank to use your account email once it’s set on your listing."}
          </p>
        </div>

        {error && <p className="!mb-0 !mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={DASH_BTN_PRIMARY}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function SettingsTab({
  vendor,
  onVendorSaved,
}: {
  vendor: VendorProfile;
  onVendorSaved: (vendor: VendorProfile) => void;
}) {
  return (
    <div className="space-y-6">
      <h1 className={DASH_PAGE_TITLE}>Settings</h1>
      <section>
        <h2 className={`mb-3 ${DASH_SECTION_TITLE}`}>Account</h2>
        <div className={`${DASH_CARD} p-5 sm:p-6`}>
          <dl className={`!m-0 text-sm ${DASH_DIVIDE}`}>
            <div className="flex justify-between gap-4 py-2.5 first:pt-0">
              <dt className={DASH_MUTED}>Business name</dt>
              <dd className={`!m-0 text-right font-medium ${DASH_INK}`}>{vendor.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className={DASH_MUTED}>Email</dt>
              <dd className={`!m-0 text-right font-medium ${DASH_INK}`}>{vendor.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5 last:pb-0">
              <dt className={DASH_MUTED}>Phone</dt>
              <dd className={`!m-0 text-right font-medium ${DASH_INK}`}>{vendor.phone ?? "—"}</dd>
            </div>
          </dl>
          <Link href="/onboard/step/1" className={`mt-5 ${DASH_BTN_SECONDARY} !px-3 !py-1.5`}>
            Edit account details
          </Link>
        </div>
      </section>

      <BookingNotificationsPanel vendor={vendor} onSaved={onVendorSaved} heading={false} />
    </div>
  );
}
