"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calculatePlatformServiceFeeCents,
  PLATFORM_SERVICE_FEE_PERCENT_LABEL,
} from "@/lib/booking-constants";

export type SerializableSession = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string | null;
  classType: string;
  priceCents: number;
  spotsLeft: number;
  timezone: string;
};

type Props = {
  vendorSlug: string;
  vendorName: string;
  sessions: SerializableSession[];
  refundPolicy: string | null;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CARD_CLASS =
  "rounded-[14px] border border-[rgba(17,24,39,0.12)] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:px-6 sm:py-6";

const FIELD_CLASS =
  "mt-1.5 w-full rounded-lg border border-[rgba(17,24,39,0.15)] bg-white px-2.5 py-2 text-xs text-[#141413] placeholder:text-zinc-400 focus:border-[#141413] focus:outline-none focus:ring-[3px] focus:ring-[rgba(24,24,27,0.08)] disabled:cursor-not-allowed disabled:bg-[#fafafa]";

type CardIconType = "classType" | "calendar" | "user" | "cart";

function CardIcon({ type }: { type: CardIconType }) {
  const strokeProps = {
    stroke: "#c96442",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(201,100,66,0.1)]"
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

/** Matches `ClassSession.classType` in the database */
type ClassFilterKey = "__all__" | "initial" | "renewal" | "add_a_gun";

const CLASS_FILTER_OPTIONS: { key: ClassFilterKey; label: string }[] = [
  { key: "__all__", label: "All" },
  { key: "initial", label: "Initial" },
  { key: "renewal", label: "Renewal" },
  { key: "add_a_gun", label: "Add a gun" },
];

function filterLabel(key: ClassFilterKey) {
  return CLASS_FILTER_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

function defaultSessionTitle(classType: string) {
  if (classType === "initial") return "16hr Initial";
  if (classType === "add_a_gun") return "Add a gun";
  return "8hr Renewal";
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
  key: ClassFilterKey,
  allSessions: SerializableSession[]
): SerializableSession[] {
  if (key === "__all__") return allSessions;
  return allSessions.filter((s) => s.classType === key);
}

export function VendorBookForm({ vendorSlug, vendorName, sessions, refundPolicy }: Props) {
  const [classTypeStepComplete, setClassTypeStepComplete] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<ClassFilterKey | null>(null);

  const sessionsForType = useMemo(() => {
    if (!classTypeStepComplete || selectedClassFilter === null) return [];
    return applyClassFilter(selectedClassFilter, sessions);
  }, [sessions, selectedClassFilter, classTypeStepComplete]);

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
  const [classSessionId, setClassSessionId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refundPolicyOpen, setRefundPolicyOpen] = useState(false);

  const sessionsForDate = useMemo(
    () =>
      sessionsForType
        .filter((s) => formatDateKeyInTz(new Date(s.startsAt), tzForType) === selectedDateKey)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [sessionsForType, selectedDateKey, tzForType]
  );
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const selected = sessions.find((s) => s.id === classSessionId);
  const classCents = selected?.priceCents ?? 0;
  const feeCents = calculatePlatformServiceFeeCents(classCents);
  const totalCents = classCents + feeCents;

  function selectClassType(key: ClassFilterKey) {
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
    setClassSessionId("");
    setError(null);
  }

  function editClassTypeStep() {
    setClassTypeStepComplete(false);
    setSelectedClassFilter(null);
    setClassSessionId("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!classSessionId) {
      setError("Choose a class session.");
      return;
    }
    const phoneDigits = customerPhone.replace(/\D/g, "");
    const ten =
      phoneDigits.length === 11 && phoneDigits.startsWith("1")
        ? phoneDigits.slice(1)
        : phoneDigits;
    if (ten.length !== 10) {
      setError("Enter a 10-digit phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorSlug,
          classSessionId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL returned.");
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

  const step1Expanded = !classTypeStepComplete;
  const step2Active = classTypeStepComplete;

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10"
    >
      <div className="space-y-4">
        {/* Step 1 — class type */}
        <section className={`${CARD_CLASS} bg-white`} aria-labelledby="book-step-1-title">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardIcon type="classType" />
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
                <div className="divide-y divide-[#edeae3] rounded-lg border border-[#e2ddd1] bg-white">
                  {CLASS_FILTER_OPTIONS.map(({ key, label }) => {
                    const id = `class-type-${key}`;
                    const isSelected = selectedClassFilter === key;
                    return (
                      <div
                        key={key}
                        className="relative flex w-full items-stretch hover:bg-[#fefcf9] focus-within:bg-[#fefcf9]"
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
            <p className="mt-2 text-sm leading-snug text-zinc-700">
              <span className="text-zinc-500">Selected:</span>{" "}
              <span className="font-medium text-zinc-900">
                {selectedClassFilter !== null ? filterLabel(selectedClassFilter) : "—"}
              </span>
            </p>
          )}
        </section>

        {/* Step 2 — date & session (locked until step 1) */}
        <section
          className={`${CARD_CLASS} bg-white ${step2Active ? "" : "opacity-90"}`}
          aria-labelledby="book-step-2-title"
        >
          <div className="flex items-center gap-3">
            <CardIcon type="calendar" />
            <h2
              id="book-step-2-title"
              className={`!mb-0 text-xs font-semibold ${step2Active ? "text-zinc-900" : "text-zinc-400"}`}
            >
              Pick a date &amp; session
            </h2>
          </div>

          {!step2Active && (
            <p className="mt-2 text-sm leading-snug text-zinc-500">
              Complete step 1 to see available dates and class times.
            </p>
          )}

          {step2Active && (
            <>
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-md border border-[#cfc7b8] px-2 py-1 text-xs text-zinc-700 hover:bg-[#f2efe8]"
                    onClick={() =>
                      setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                    }
                  >
                    Prev
                  </button>
                  <p className="text-xs font-semibold text-zinc-800">{monthTitle(currentMonth)}</p>
                  <button
                    type="button"
                    className="rounded-md border border-[#cfc7b8] px-2 py-1 text-xs text-zinc-700 hover:bg-[#f2efe8]"
                    onClick={() =>
                      setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                    }
                  >
                    Next
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
                          setClassSessionId("");
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
                <p className="mt-3 text-sm leading-snug text-zinc-500">
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
                  <div className="mt-3 space-y-2">
                    {sessionsForDate.map((s) => {
                      const checked = classSessionId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setClassSessionId(s.id);
                            setError(null);
                          }}
                          className={`w-full rounded-lg border p-2.5 text-left text-sm shadow-sm transition-colors ${
                            checked
                              ? "border-[#cfc7b8] bg-[#f2efe8]/60"
                              : "border-[#e2ddd1] bg-white hover:border-[#cfc7b8] hover:bg-[#fefcf9]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-zinc-900">
                              {s.title ?? defaultSessionTitle(s.classType)}
                            </p>
                            <p className="shrink-0 font-semibold text-zinc-900">
                              ${(s.priceCents / 100).toFixed(2)}
                            </p>
                          </div>
                          <p className="mt-1 text-zinc-600">
                            {formatSessionTime(s)} - {s.spotsLeft} spot
                            {s.spotsLeft === 1 ? "" : "s"} left
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Right: guest details + summary + CTA (sticky on lg) */}
      <div className="space-y-6 lg:sticky lg:top-[calc(var(--header-offset)+1rem)]">
        <div className={`${CARD_CLASS} bg-white`}>
          <div className="flex items-center gap-3">
            <CardIcon type="user" />
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
                  disabled={!classSessionId}
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
                  disabled={!classSessionId}
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
                disabled={!classSessionId}
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
                placeholder="(555) 555-5555"
                value={customerPhone}
                disabled={!classSessionId}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </div>

        <div className={`${CARD_CLASS} bg-white text-sm`}>
          <div className="flex items-center gap-3">
            <CardIcon type="cart" />
            <h2 className="!mb-0 text-xs font-semibold text-zinc-900">Order summary</h2>
          </div>
          <ul
            className="space-y-1.5 text-zinc-700"
            style={{ listStyle: "none", margin: "1.25rem 0 0", padding: 0 }}
          >
            <li className="flex justify-between gap-4">
              <span className="text-zinc-600">Class price</span>
              <span className="tabular-nums font-medium text-zinc-900">
                ${(classCents / 100).toFixed(2)}
              </span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-zinc-600">
                Booking service fee ({PLATFORM_SERVICE_FEE_PERCENT_LABEL}, non-refundable)
              </span>
              <span className="tabular-nums font-medium text-zinc-900">
                ${(feeCents / 100).toFixed(2)}
              </span>
            </li>
            <li className="flex justify-between gap-4 border-t border-[rgba(17,24,39,0.12)] pt-2.5 pb-1 text-sm font-semibold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">${(totalCents / 100).toFixed(2)}</span>
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
                  Set by the instructor and applies to the class price. The{" "}
                  {PLATFORM_SERVICE_FEE_PERCENT_LABEL} booking service fee is non-refundable.
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

        <button
          type="submit"
          disabled={submitting || !classSessionId}
          className="btn-primary bg-secondary-2 small w-button w-full disabled:cursor-not-allowed"
        >
          {submitting ? "Redirecting to secure checkout…" : "Continue to payment"}
        </button>
      </div>
    </form>
  );
}
