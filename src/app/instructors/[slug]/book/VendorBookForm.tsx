"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLATFORM_SERVICE_FEE_PERCENT_LABEL } from "@/lib/booking-constants";
import {
  PLATFORM_FEE_LINE_LABEL,
  formatCents,
  type FeeRule,
} from "@/lib/instructor-catalog";
import {
  buildCartCheckoutAmounts,
  dayIndexLabel,
  sessionDisplayTitle,
  validateInitialPair,
  type CartSessionLike,
} from "@/lib/booking-cart";
import { BookingPaymentStep } from "./BookingPaymentStep";

export type SerializableSession = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string | null;
  classType: string;
  dayIndex: number | null;
  priceCents: number;
  spotsLeft: number;
  timezone: string;
};

type Props = {
  vendorSlug: string;
  vendorName: string;
  sessions: SerializableSession[];
  refundPolicy: string | null;
  /** Active classes besides the three CCW types. CCW choices stay in the list. */
  extraClassChoices?: { key: string; label: string }[];
  initialClassKey?: string | null;
  checkoutFees?: FeeRule[];
  catalogInitialPriceCents?: number | null;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CARD_CLASS =
  "rounded-[14px] border border-[rgba(17,24,39,0.12)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:px-6 sm:py-6";

/** Progressive step focus: active card uses Explore-by-category tan; idle stays white. */
const CARD_BG_FOCUS = "bg-[#f2efe8]";
const CARD_BG_IDLE = "bg-white";
/** Soft inset panels (class options, session rows) — not pure white on tan. */
const PANEL_BG = "bg-[#fefcf9]";

function cardSurfaceClass(focused: boolean) {
  return focused ? CARD_BG_FOCUS : CARD_BG_IDLE;
}

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-[rgba(17,24,39,0.15)] bg-white px-2.5 py-2 text-xs text-[#141413] placeholder:text-zinc-400 focus:border-[#141413] focus:outline-none focus:ring-[3px] focus:ring-[rgba(24,24,27,0.08)] disabled:cursor-not-allowed disabled:bg-[#fafafa]";

type CardIconType = "classType" | "calendar" | "user" | "cart";

function CardIcon({ type, onTan = false }: { type: CardIconType; onTan?: boolean }) {
  const strokeProps = {
    stroke: onTan ? "#141413" : "#c96442",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <span
      aria-hidden
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
        onTan ? "bg-[rgba(20,20,19,0.08)]" : "bg-[rgba(201,100,66,0.1)]"
      }`}
    >
      <svg width={22} height={22} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        {type === "classType" && (
          <>
            <rect x="3.5" y="3.5" width="15" height="15" rx="2.5" {...strokeProps} />
            <path d="M7.5 8h7M7.5 11h7M7.5 14h4" {...strokeProps} />
          </>
        )}
        {type === "calendar" && (
          <>
            <rect x="3.5" y="5" width="15" height="13" rx="2.5" {...strokeProps} />
            <path d="M3.5 9.5h15" {...strokeProps} />
            <path d="M7.5 3.5v3M14.5 3.5v3" {...strokeProps} />
            <path d="M8 13.5l2 2 4-4" {...strokeProps} />
          </>
        )}
        {type === "user" && (
          <>
            <circle cx="11" cy="7.5" r="3.5" {...strokeProps} />
            <path d="M4.5 18.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" {...strokeProps} />
          </>
        )}
        {type === "cart" && (
          <>
            <path d="M2.5 3.5h2.2l2 10h9.8l1.8-7H6" {...strokeProps} />
            <circle cx="8.5" cy="17.5" r="1.3" {...strokeProps} />
            <circle cx="15.5" cy="17.5" r="1.3" {...strokeProps} />
          </>
        )}
      </svg>
    </span>
  );
}

const CCW_CLASS_CHOICES: { key: string; label: string }[] = [
  { key: "initial", label: "Initial" },
  { key: "renewal", label: "Renewal" },
  { key: "add_a_gun", label: "Add a gun" },
];

function filterLabel(key: string, options: { key: string; label: string }[]) {
  return options.find((o) => o.key === key)?.label ?? key;
}

function toCartSession(s: SerializableSession): CartSessionLike {
  return {
    id: s.id,
    classType: s.classType,
    startsAt: new Date(s.startsAt),
    timezone: s.timezone,
    priceCents: s.priceCents,
    dayIndex: s.dayIndex,
    enrolled: 0,
    capacity: Math.max(s.spotsLeft, 1),
    title: s.title,
  };
}

function sessionTitle(s: SerializableSession) {
  return sessionDisplayTitle({
    title: s.title,
    classType: s.classType,
    dayIndex: s.dayIndex,
  });
}

function formatDateKeyInTz(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function formatSessionTime(s: SerializableSession) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: s.timezone || "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(s.startsAt));
}

function formatSessionDateLong(s: SerializableSession) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: s.timezone || "America/Los_Angeles",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(s.startsAt));
}

function monthTitle(month: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(month);
}

/** Up to 10 US digits; strips a leading country code 1. */
function phoneTenDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) return digits.slice(1, 11);
  return digits.slice(0, 10);
}

/** Live mask: (630)815-5383 */
function formatPhoneDisplay(raw: string): string {
  const ten = phoneTenDigits(raw);
  if (ten.length === 0) return "";
  if (ten.length < 4) return `(${ten}`;
  if (ten.length < 7) return `(${ten.slice(0, 3)})${ten.slice(3)}`;
  return `(${ten.slice(0, 3)})${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function buildCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const startOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = startOfMonth.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const days: Array<{ date: Date | null; id: string }> = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - leading + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      days.push({ date: null, id: `empty-${i}` });
      continue;
    }
    days.push({
      date: new Date(year, monthIndex, dayNumber, 12, 0, 0, 0),
      id: `d-${year}-${monthIndex + 1}-${dayNumber}`,
    });
  }
  return days;
}

function applyClassFilter(
  key: string,
  allSessions: SerializableSession[]
): SerializableSession[] {
  if (key === "__all__") return allSessions;
  return allSessions.filter((s) => s.classType === key);
}

export function VendorBookForm({
  vendorSlug,
  vendorName,
  sessions,
  refundPolicy,
  extraClassChoices = [],
  initialClassKey = null,
  checkoutFees = [],
  catalogInitialPriceCents = null,
}: Props) {
  const filterOptions = [
    { key: "__all__", label: "All" },
    ...CCW_CLASS_CHOICES,
    ...extraClassChoices.filter((choice) => !CCW_CLASS_CHOICES.some((ccw) => ccw.key === choice.key)),
  ];
  const [classTypeStepComplete, setClassTypeStepComplete] = useState(Boolean(initialClassKey));
  const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(initialClassKey);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [calendarCommitted, setCalendarCommitted] = useState(false);

  const sessionsForType = useMemo(() => {
    if (!classTypeStepComplete || selectedClassFilter === null) return [];
    return applyClassFilter(selectedClassFilter, sessions);
  }, [sessions, selectedClassFilter, classTypeStepComplete]);

  const isInitialPick = selectedClassFilter === "initial";
  const availableInitial = useMemo(
    () => sessions.filter((s) => s.classType === "initial").map(toCartSession),
    [sessions]
  );

  const tzForType =
    sessionsForType[0]?.timezone || sessions[0]?.timezone || "America/Los_Angeles";
  const availableDateKeys = useMemo(
    () =>
      new Set(
        sessionsForType.map((s) => formatDateKeyInTz(new Date(s.startsAt), tzForType))
      ),
    [sessionsForType, tzForType]
  );
  const firstAvailableDateKey = useMemo(() => {
    const sorted = [...availableDateKeys].sort();
    return sorted[0] ?? "";
  }, [availableDateKeys]);
  const initialMonth = useMemo(() => {
    const first = sessionsForType[0] ? new Date(sessionsForType[0].startsAt) : new Date();
    return new Date(first.getFullYear(), first.getMonth(), 1);
  }, [sessionsForType]);

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState(firstAvailableDateKey);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refundPolicyOpen, setRefundPolicyOpen] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);

  const sessionsForDate = useMemo(
    () =>
      sessionsForType
        .filter((s) => formatDateKeyInTz(new Date(s.startsAt), tzForType) === selectedDateKey)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessionsForType, selectedDateKey, tzForType]
  );
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const pendingSessions = useMemo(
    () =>
      pendingIds
        .map((id) => sessions.find((s) => s.id === id))
        .filter((s): s is SerializableSession => Boolean(s)),
    [pendingIds, sessions]
  );
  const cartSessions = useMemo(
    () =>
      cartIds
        .map((id) => sessions.find((s) => s.id === id))
        .filter((s): s is SerializableSession => Boolean(s)),
    [cartIds, sessions]
  );

  const pendingReady = useMemo(() => {
    if (isInitialPick) {
      return validateInitialPair(
        pendingSessions.map(toCartSession),
        availableInitial
      ).ok;
    }
    return pendingIds.length === 1;
  }, [isInitialPick, pendingSessions, availableInitial, pendingIds.length]);

  const amounts = buildCartCheckoutAmounts(
    cartSessions.map(toCartSession),
    checkoutFees,
    catalogInitialPriceCents
  );
  const feeNotes = new Map(checkoutFees.map((fee) => [fee.id, fee.note]));
  /** Cart has at least one committed session (details stay available while adding more). */
  const cartReady = cartIds.length > 0;

  function selectClassType(key: string) {
    const nextSessions = applyClassFilter(key, sessions);
    const sorted = [...nextSessions].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    const nextTz = sorted[0]?.timezone || "America/Los_Angeles";
    const nextDates = sorted
      .map((s) => formatDateKeyInTz(new Date(s.startsAt), nextTz))
      .sort();
    const firstStartsAt = sorted[0] ? new Date(sorted[0].startsAt) : new Date();
    setSelectedClassFilter(key);
    setClassTypeStepComplete(true);
    setSelectedDateKey(nextDates[0] ?? "");
    setCurrentMonth(new Date(firstStartsAt.getFullYear(), firstStartsAt.getMonth(), 1));
    setPendingIds([]);
    setCalendarCommitted(false);
    setError(null);
  }

  function editClassTypeStep() {
    setClassTypeStepComplete(false);
    setSelectedClassFilter(null);
    setPendingIds([]);
    setCalendarCommitted(false);
    setError(null);
  }

  function commitPendingToCart() {
    if (!pendingReady) {
      setError(
        isInitialPick
          ? "Initial is 16 hours across two days — select both."
          : "Choose a class session."
      );
      return;
    }
    setCartIds((prev) => {
      // Replacing an Initial pair keeps the cart at exactly two Initial days.
      const base = isInitialPick
        ? prev.filter((id) => sessions.find((s) => s.id === id)?.classType !== "initial")
        : prev.filter((id) => !pendingIds.includes(id));
      return [...new Set([...base, ...pendingIds])];
    });
    setPendingIds([]);
    setCalendarCommitted(true);
    setError(null);
  }

  function addAnotherClass() {
    setClassTypeStepComplete(false);
    setSelectedClassFilter(null);
    setPendingIds([]);
    setCalendarCommitted(false);
    setError(null);
  }

  function togglePendingSession(id: string) {
    setCalendarCommitted(false);
    setError(null);
    if (isInitialPick) {
      setPendingIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= 2) return [prev[1]!, id];
        return [...prev, id];
      });
      return;
    }
    setPendingIds([id]);
  }

  function removeFromCart(id: string) {
    setCartIds((prev) => {
      const next = prev.filter((x) => x !== id);
      if (next.length === 0) setCalendarCommitted(false);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cartIds.length === 0) {
      setError("Choose a class session.");
      return;
    }
    const ten = phoneTenDigits(customerPhone);
    if (ten.length !== 10) {
      setPhoneError("Enter a 10-digit phone number.");
      setError("Enter a 10-digit phone number.");
      return;
    }
    setPhoneError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorSlug,
          classSessionIds: cartIds,
          classSessionId: cartIds[0],
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });
      const data = (await res.json()) as { clientSecret?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.clientSecret) {
        setPaymentClientSecret(data.clientSecret);
        return;
      }
      setError("Could not start payment. Check that Stripe publishable key is configured.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e2ddd1] bg-[#fefcf9] p-8 text-center">
        <p className="text-sm text-zinc-800">
          No upcoming classes with open seats right now. Check back soon or contact{" "}
          <span className="font-semibold">{vendorName}</span> directly.
        </p>
        <Link
          href={`/instructors/${vendorSlug}`}
          className="mt-6 inline-block text-sm font-semibold text-[#C1440E] underline-offset-2 hover:underline"
        >
          ← Back to profile
        </Link>
      </div>
    );
  }

  if (paymentClientSecret && cartSessions.length > 0) {
    const whenLabel = cartSessions
      .map((s) => `${sessionTitle(s)}: ${formatSessionDateLong(s)} · ${formatSessionTime(s)}`)
      .join(" · ");
    return (
      <BookingPaymentStep
        clientSecret={paymentClientSecret}
        onBack={() => {
          setPaymentClientSecret(null);
          setError(null);
        }}
        summary={{
          classTitle: cartSessions.map((s) => sessionTitle(s)).join(" + "),
          whenLabel,
          customerName: `${firstName.trim()} ${lastName.trim()}`,
          customerEmail: customerEmail.trim(),
          classAmountCents: amounts.classTuitionCents,
          platformFeeCents: amounts.platformFeeCents,
          passThrough: amounts.passThrough.map((fee) => ({
            id: fee.id,
            name: fee.name,
            amountCents: fee.amountCents,
            note: feeNotes.get(fee.id) ?? null,
          })),
          totalCents: amounts.totalCents,
          refundPolicy,
          vendorName,
        }}
      />
    );
  }

  const step1Expanded = !classTypeStepComplete;
  const step2Active = classTypeStepComplete && !calendarCommitted;

  const detailsLookFilled =
    Boolean(firstName.trim()) &&
    Boolean(lastName.trim()) &&
    Boolean(customerEmail.trim()) &&
    phoneTenDigits(customerPhone).length === 10;

  /** 1 class type → 2 date/session → 3 details → 4 summary */
  const focusStep: 1 | 2 | 3 | 4 = !classTypeStepComplete
    ? 1
    : !cartReady
      ? 2
      : detailsLookFilled
        ? 4
        : 3;

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10"
    >
      <div className="space-y-4">
        {/* Step 1 — class type */}
        <section
          className={`${CARD_CLASS} ${cardSurfaceClass(focusStep === 1)}`}
          aria-labelledby="book-step-1-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardIcon type="classType" onTan={focusStep === 1} />
              <h2 id="book-step-1-title" className="!mb-0 text-xs font-semibold text-zinc-900">
                Choose class type
              </h2>
            </div>
            {!step1Expanded && selectedClassFilter !== null && (
              <button
                type="button"
                onClick={editClassTypeStep}
                className="shrink-0 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {step1Expanded ? (
            <>
              <p className="mt-1.5 text-sm leading-snug text-zinc-500">
                Select which class you&apos;re booking. You can change this later.
              </p>
              <div
                className="mt-4 w-full min-w-0"
                role="radiogroup"
                aria-label="Class type"
              >
                <div
                  className={`divide-y divide-[#edeae3] rounded-lg border border-[#e2ddd1] ${PANEL_BG}`}
                >
                  {filterOptions.map(({ key, label }) => {
                    const id = `class-type-${key}`;
                    const isSelected = selectedClassFilter === key;
                    return (
                      <div
                        key={key}
                        className="relative flex w-full items-stretch hover:bg-white focus-within:bg-white"
                      >
                        <input
                          id={id}
                          type="radio"
                          name="classTypeFilter"
                          value={key}
                          checked={isSelected}
                          onChange={() => selectClassType(key)}
                          className="sr-only"
                        />
                        <label
                          htmlFor={id}
                          className="!mb-0 !flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-4 px-3 py-3.5 !font-normal sm:px-4"
                        >
                          <span className="min-w-0 flex-1 text-base font-medium text-zinc-900">
                            {label}
                          </span>
                          <span
                            aria-hidden
                            className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors ${
                              isSelected ? "border-[#C1440E]" : "border-[#cfc7b8]"
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full bg-[#C1440E] transition-opacity ${
                                isSelected ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="!mt-4 text-sm leading-snug text-zinc-700">
              <span className="text-zinc-500">Selected:</span>{" "}
              <span className="font-medium text-zinc-900">
                {selectedClassFilter !== null ? filterLabel(selectedClassFilter, filterOptions) : "—"}
              </span>
            </p>
          )}
        </section>

        {/* Step 2 — date & session (locked until step 1) */}
        <section
          className={`${CARD_CLASS} ${cardSurfaceClass(focusStep === 2)} ${step2Active ? "" : "opacity-90"}`}
          aria-labelledby="book-step-2-title"
        >
          <div className="flex items-center gap-3">
            <CardIcon type="calendar" onTan={focusStep === 2} />
            <h2
              id="book-step-2-title"
              className={`!mb-0 text-xs font-semibold ${
                classTypeStepComplete ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {isInitialPick ? "Pick two days & sessions" : "Pick a date & session"}
            </h2>
          </div>

          {!classTypeStepComplete && (
            <p className="mt-2 text-sm leading-snug text-zinc-500">
              Complete step 1 to see available dates and class times.
            </p>
          )}

          {classTypeStepComplete && calendarCommitted && (
            <div className="mt-4 space-y-3">
              <p className="text-sm leading-snug text-zinc-700">
                <span className="text-zinc-500">In your cart:</span>{" "}
                <span className="font-medium text-zinc-900">
                  {cartSessions.map((s) => sessionTitle(s)).join(" + ") || "—"}
                </span>
              </p>
              <button
                type="button"
                onClick={addAnotherClass}
                className="text-xs font-medium text-[#C1440E] underline-offset-2 hover:underline"
              >
                Add another class
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartIds([]);
                  setCalendarCommitted(false);
                  setPendingIds([]);
                }}
                className="ml-4 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
              >
                Change dates
              </button>
            </div>
          )}

          {step2Active && (
            <>
              {isInitialPick && (
                <p className="mt-2 text-sm leading-snug text-zinc-600">
                  Initial is 16 hours across two days — select both.
                  {pendingIds.length > 0 && (
                    <span className="mt-1 block font-medium text-zinc-800">
                      Selected {pendingIds.length}/2
                      {pendingSessions.length > 0
                        ? `: ${pendingSessions.map((s) => sessionTitle(s)).join(", ")}`
                        : ""}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="inline-flex items-center gap-1 rounded-md border border-[#141413]/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] shadow-sm hover:border-[#141413]/45 hover:bg-[#fefcf9]"
                    onClick={() =>
                      setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                    }
                  >
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M7.5 2.5L4 6l3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Prev
                  </button>
                  <p className="text-xs font-semibold text-zinc-800">{monthTitle(currentMonth)}</p>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="inline-flex items-center gap-1 rounded-md border border-[#141413]/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141413] shadow-sm hover:border-[#141413]/45 hover:bg-[#fefcf9]"
                    onClick={() =>
                      setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                    }
                  >
                    Next
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M4.5 2.5L8 6l-3.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
                  {DAY_NAMES.map((day) => (
                    <div key={day} className="py-1">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((cell) => {
                    if (!cell.date) {
                      return <div key={cell.id} className="h-9 rounded-md bg-transparent" />;
                    }
                    const key = formatDateKeyInTz(cell.date, tzForType);
                    const hasSessions = availableDateKeys.has(key);
                    const isSelected = selectedDateKey === key;
                    return (
                      <button
                        key={cell.id}
                        type="button"
                        disabled={!hasSessions}
                        onClick={() => {
                          setSelectedDateKey(key);
                          setError(null);
                        }}
                        className={`group h-9 rounded-md border text-xs transition-colors ${
                          isSelected
                            ? "border-[#C1440E] bg-[#C1440E] font-semibold !text-white"
                            : hasSessions
                              ? "border-[#cfc7b8] bg-white !text-[#141413] hover:border-[#C1440E] hover:bg-[#C1440E] hover:!text-white"
                              : "border-[#edeae3] bg-[#fefcf9] !text-zinc-400"
                        }`}
                      >
                        <span>{cell.date.getDate()}</span>
                        {hasSessions && (
                          <span
                            className={`mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full ${
                              isSelected ? "bg-white" : "bg-emerald-500 group-hover:bg-white"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="!mt-8 text-sm leading-snug text-zinc-500">
                  Dates with green dots have available classes.
                </p>
              </div>

              <div className="mt-6 border-t border-zinc-100 pt-4">
                <p className="text-sm font-medium text-zinc-800">
                  Classes{" "}
                  {sessionsForDate[0]
                    ? `for ${formatSessionDateLong(sessionsForDate[0])}`
                    : ""}
                </p>
                {sessionsForType.length === 0 ? (
                  <p className="mt-3 text-sm leading-snug text-zinc-600">
                    No sessions for this class type yet. Try another option in step 1.
                  </p>
                ) : sessionsForDate.length === 0 ? (
                  <p className="mt-3 text-sm leading-snug text-zinc-600">
                    Pick a highlighted date to see classes.
                  </p>
                ) : (
                  <div
                    className="mt-3 space-y-2"
                    role={isInitialPick ? "group" : "radiogroup"}
                    aria-label="Class session"
                  >
                    {sessionsForDate.map((s) => {
                      const checked = pendingIds.includes(s.id);
                      const dayLabel = dayIndexLabel(s.dayIndex);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role={isInitialPick ? "checkbox" : "radio"}
                          aria-checked={checked}
                          onClick={() => togglePendingSession(s.id)}
                          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm shadow-sm transition-colors ${
                            checked
                              ? "border-[#C1440E] bg-[#fefcf9] ring-1 ring-[#C1440E]/30"
                              : "border-[#cfc7b8] bg-[#fefcf9] hover:border-[#C1440E]/70 hover:bg-white"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 bg-[#fefcf9] transition-colors ${
                              isInitialPick ? "rounded-md" : "rounded-full"
                            } ${checked ? "border-[#C1440E]" : "border-[#cfc7b8]"}`}
                          >
                            <span
                              className={`h-2.5 w-2.5 bg-[#C1440E] transition-opacity ${
                                isInitialPick ? "rounded-sm" : "rounded-full"
                              } ${checked ? "opacity-100" : "opacity-0"}`}
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-zinc-900">
                                {sessionTitle(s)}
                                {dayLabel ? (
                                  <span className="ml-2 text-xs font-medium text-[#C1440E]">
                                    {dayLabel}
                                  </span>
                                ) : null}
                              </p>
                              {!isInitialPick && (
                                <p className="shrink-0 font-semibold text-zinc-900">
                                  ${(s.priceCents / 100).toFixed(2)}
                                </p>
                              )}
                            </div>
                            <p className="mt-1 text-zinc-600">
                              {formatSessionTime(s)} - {s.spotsLeft} spot
                              {s.spotsLeft === 1 ? "" : "s"} left
                            </p>
                            <p
                              className={`mt-1.5 text-xs font-medium ${
                                checked ? "text-[#C1440E]" : "text-zinc-500"
                              }`}
                            >
                              {checked ? "Selected" : "Select"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={commitPendingToCart}
                  disabled={!pendingReady}
                  className="mt-4 w-full rounded-lg bg-[#C1440E] px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isInitialPick
                    ? pendingReady
                      ? "Continue with these two days"
                      : "Select two days to continue"
                    : pendingReady
                      ? "Add to cart"
                      : "Select a session to continue"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Right: guest details + summary + CTA (sticky on lg) */}
      <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-offset)+1rem)]">
        <div className={`${CARD_CLASS} ${cardSurfaceClass(focusStep === 3)}`}>
          <div className="flex items-center gap-3">
            <CardIcon type="user" onTan={focusStep === 3} />
            <h2 className="!mb-0 text-xs font-semibold text-[#141413]">Your details</h2>
          </div>
          <p className="mt-3 text-sm leading-snug text-[#5e5d59]">
            Guest checkout — we&apos;ll email your confirmation. If you&apos;re signed in, we&apos;ll
            attach the booking to your profile when possible.
          </p>
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="block text-xs font-medium text-[#141413]">
                  First name
                </label>
                <input
                  id="first-name"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  disabled={!cartReady}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-xs font-medium text-[#141413]">
                  Last name
                </label>
                <input
                  id="last-name"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  disabled={!cartReady}
                  onChange={(e) => setLastName(e.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#141413]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={customerEmail}
                disabled={!cartReady}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-[#141413]">
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="(555)555-5555"
                value={customerPhone}
                disabled={!cartReady}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? "phone-error" : undefined}
                onChange={(e) => {
                  setCustomerPhone(formatPhoneDisplay(e.target.value));
                  if (phoneError) setPhoneError(null);
                }}
                onBlur={() => {
                  const ten = phoneTenDigits(customerPhone);
                  if (ten.length > 0 && ten.length < 10) {
                    setPhoneError("Enter a 10-digit phone number.");
                  } else {
                    setPhoneError(null);
                  }
                }}
                className={
                  phoneError
                    ? `${FIELD_CLASS} border-red-400 focus:border-red-500 focus:ring-red-100`
                    : FIELD_CLASS
                }
              />
              {phoneError && (
                <p id="phone-error" className="mt-1.5 text-xs text-red-700" role="alert">
                  {phoneError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={`${CARD_CLASS} ${cardSurfaceClass(focusStep === 4)} text-sm`}>
          <div className="flex items-center gap-3">
            <CardIcon type="cart" onTan={focusStep === 4} />
            <h2 className="!mb-0 text-xs font-semibold text-zinc-900">Order summary</h2>
          </div>
          {cartSessions.length > 0 && (
            <ul
              className="space-y-2 text-zinc-700"
              style={{ listStyle: "none", margin: "1.25rem 0 0", padding: 0 }}
            >
              {cartSessions.map((s) => (
                <li key={s.id} className="flex justify-between gap-3 text-xs">
                  <span className="min-w-0">
                    <span className="font-medium text-zinc-900">{sessionTitle(s)}</span>
                    <span className="mt-0.5 block text-zinc-500">
                      {formatSessionDateLong(s)} · {formatSessionTime(s)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(s.id)}
                    className="shrink-0 text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul
            className="space-y-1.5 text-zinc-700"
            style={{ listStyle: "none", margin: "1.25rem 0 0", padding: 0 }}
          >
            <li className="flex justify-between gap-4">
              <span className="text-zinc-600">
                {cartSessions.some((s) => s.classType === "initial") &&
                cartSessions.filter((s) => s.classType === "initial").length === 2
                  ? "Class price (Initial package)"
                  : "Class price"}
              </span>
              <span className="tabular-nums font-medium text-zinc-900">
                {formatCents(amounts.classTuitionCents)}
              </span>
            </li>
            {amounts.passThrough.map((fee) => (
              <li key={fee.id} className="flex justify-between gap-4">
                <span className="text-zinc-600">
                  {fee.name}
                  {feeNotes.get(fee.id) ? (
                    <span className="mt-0.5 block text-xs text-zinc-500">{feeNotes.get(fee.id)}</span>
                  ) : null}
                </span>
                <span className="tabular-nums font-medium text-zinc-900">
                  {formatCents(fee.amountCents)}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-4">
              <span className="text-zinc-600">{PLATFORM_FEE_LINE_LABEL}</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {formatCents(amounts.platformFeeCents)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-t border-[rgba(17,24,39,0.12)] pt-2.5 pb-1 text-sm font-semibold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(amounts.totalCents)}</span>
            </li>
          </ul>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setRefundPolicyOpen((open) => !open)}
              aria-expanded={refundPolicyOpen}
              aria-controls="refund-policy-panel"
              className="inline-flex items-center gap-1.5 text-xs font-medium !text-[#5e5d59] underline-offset-2 hover:!text-[#141413] hover:underline"
            >
              <svg width={14} height={14} viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="10" cy="6.4" r="0.9" fill="currentColor" />
              </svg>
              Refund policy
            </button>
            {refundPolicyOpen && (
              <div
                id="refund-policy-panel"
                className="mt-2 rounded-lg border border-[rgba(17,24,39,0.12)] bg-[#fafafa] px-3 py-2.5 text-xs leading-relaxed text-[#5e5d59]"
              >
                <p className="!mb-1 font-medium text-[#141413]">
                  {refundPolicy ?? `Contact ${vendorName} for their refund policy.`}
                </p>
                <p className="!mb-0">
                  Set by the instructor and applies to the class price and fees they add, such as
                  range or ammo. For multi-day bookings, the deadline is before your first class day.
                  The CarryClass transaction fee ({PLATFORM_SERVICE_FEE_PERCENT_LABEL}) is
                  non-refundable. Refunds cover the whole payment.
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
            {error}
          </p>
        )}

        {cartReady && (
          <button
            type="button"
            onClick={addAnotherClass}
            className="w-full rounded-lg border border-[#cfc7b8] bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 hover:border-[#C1440E]/50"
          >
            Add another class
          </button>
        )}

        <button
          type="submit"
          disabled={submitting || !cartReady}
          className="btn-primary bg-secondary-2 small w-button w-full disabled:cursor-not-allowed"
        >
          {submitting ? "Preparing secure payment…" : "Continue to payment"}
        </button>
      </div>
    </form>
  );
}
