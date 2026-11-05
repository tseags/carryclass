"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BookingConfirmation } from "@/lib/booking-confirmation";
import { PLATFORM_FEE_LINE_LABEL, formatCents } from "@/lib/instructor-catalog";

type Props = { sessionId: string; initial: BookingConfirmation };

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 40;

const CARD_CLASS =
  "rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:px-6 sm:py-6";

function formatInTz(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(new Date(iso));
  }
}

function classDateLabel(data: BookingConfirmation) {
  return formatInTz(data.startsAt, data.timezone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function classTimeLabel(data: BookingConfirmation) {
  const start = formatInTz(data.startsAt, data.timezone, { hour: "numeric", minute: "2-digit" });
  if (!data.endsAt) {
    return formatInTz(data.startsAt, data.timezone, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
  const end = formatInTz(data.endsAt, data.timezone, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${start} – ${end}`;
}

function googleCalendarUrl(data: BookingConfirmation) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(data.startsAt);
  const end = data.endsAt ? new Date(data.endsAt) : new Date(start.getTime() + 8 * 3_600_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${data.classTitle} — ${data.vendorName}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: data.confirmationCode
      ? `CarryClass confirmation #: ${data.confirmationCode}`
      : "Booked on CarryClass",
  });
  if (data.location) params.set("location", data.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

type IconType = "check" | "spinner" | "alert" | "calendar" | "clock" | "pin" | "user";

function Icon({ type, className = "" }: { type: IconType; className?: string }) {
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  } as const;
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
      className={`${type === "spinner" ? "animate-spin" : ""} ${className}`}
    >
      {type === "check" && <path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={2.4} />}
      {type === "spinner" && (
        <path d="M12 3a9 9 0 1 0 9 9" {...stroke} strokeWidth={2.4} />
      )}
      {type === "alert" && (
        <>
          <path d="M12 8v5" {...stroke} strokeWidth={2.4} />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
        </>
      )}
      {type === "calendar" && (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" {...stroke} />
          <path d="M3.5 10h17M8 3v4M16 3v4" {...stroke} />
        </>
      )}
      {type === "clock" && (
        <>
          <circle cx="12" cy="12" r="8.5" {...stroke} />
          <path d="M12 7.5V12l3 2" {...stroke} />
        </>
      )}
      {type === "pin" && (
        <>
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" {...stroke} />
          <circle cx="12" cy="10" r="2.3" {...stroke} />
        </>
      )}
      {type === "user" && (
        <>
          <circle cx="12" cy="8" r="3.7" {...stroke} />
          <path d="M4.8 20c.9-3.4 3.7-5.4 7.2-5.4s6.3 2 7.2 5.4" {...stroke} />
        </>
      )}
    </svg>
  );
}

function DetailRow({ icon, label, children }: { icon: IconType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,100,66,0.1)] text-[#c96442]">
        <Icon type={icon} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className="mt-0.5 text-sm text-zinc-900">{children}</dd>
      </div>
    </div>
  );
}

function ConfirmationCodeCard({ data }: { data: BookingConfirmation }) {
  const [copied, setCopied] = useState(false);
  const code = data.confirmationCode;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-[14px] bg-[#f2efe8] p-5 sm:px-6 sm:py-6" aria-live="polite">
      <p className="!mb-0 text-xs font-medium uppercase tracking-wide text-[#5e5d59]">
        Confirmation number
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {code ? (
          <>
            <span className="text-2xl font-semibold tabular-nums tracking-[0.08em] text-[#141413] sm:text-3xl">
              {code}
            </span>
            <button
              type="button"
              onClick={copy}
              className="rounded-full border border-[rgba(17,24,39,0.15)] bg-white px-3 py-1 text-xs font-medium !text-[#141413] transition-colors hover:border-[#141413] print:hidden"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </>
        ) : data.state === "pending" ? (
          <span className="h-9 w-48 animate-pulse rounded-md bg-[rgba(20,20,19,0.08)]" />
        ) : (
          <span className="text-sm text-[#5e5d59]">Issued once your booking is confirmed.</span>
        )}
      </div>
      <p className="!mb-0 mt-3 text-sm leading-snug text-[#5e5d59]">
        {data.state === "pending"
          ? "Generating your confirmation number…"
          : `Use this number if you contact ${data.vendorName} or CarryClass about your booking.`}
      </p>
    </section>
  );
}

function Hero({ data, timedOut }: { data: BookingConfirmation; timedOut: boolean }) {
  const firstName = data.customerName.trim().split(/\s+/)[0];
  if (data.state === "unpaid") {
    return (
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Icon type="alert" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Payment not completed</h1>
          <p className="mt-2 text-zinc-600">
            Your card wasn&apos;t charged and no seat is held. You can return to checkout to try again.
          </p>
        </div>
      </div>
    );
  }
  if (data.state === "pending") {
    return (
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(201,100,66,0.12)] text-[#C1440E]">
          <Icon type="spinner" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Finalizing your booking…</h1>
          <p className="mt-2 text-zinc-600">
            {timedOut
              ? `This is taking longer than usual. Your payment went through — we'll email your confirmation to ${data.customerEmail || "you"} as soon as it's ready.`
              : `Your payment went through. We're reserving your seat with ${data.vendorName} — this usually takes a few seconds.`}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Icon type="check" className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          {firstName ? `You're booked, ${firstName}!` : "You're booked!"}
        </h1>
        <p className="mt-2 text-zinc-600">
          Your seat with {data.vendorName} is confirmed.
          {data.customerEmail ? ` A confirmation email is on its way to ${data.customerEmail}.` : ""}
        </p>
      </div>
    </div>
  );
}

function PaymentSummary({ data }: { data: BookingConfirmation }) {
  const paidOn = data.paidAt
    ? formatInTz(data.paidAt, data.timezone, { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <section className={`${CARD_CLASS} text-sm`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="!mb-0 !text-base !font-semibold !leading-snug text-zinc-900">Payment summary</h2>
        {data.state === "confirmed" && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Paid
          </span>
        )}
        {data.state === "pending" && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            Processing
          </span>
        )}
        {data.state === "unpaid" && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            Not charged
          </span>
        )}
      </div>
      <ul
        className="space-y-2 text-zinc-700"
        style={{ listStyle: "none", margin: "1.25rem 0 0", padding: 0 }}
      >
        <li className="flex justify-between gap-4">
          <span className="text-zinc-600">Class price</span>
          <span className="tabular-nums font-medium text-zinc-900">
            {formatCents(data.classAmountCents)}
          </span>
        </li>
        {data.passThroughFees.map((fee) => (
          <li key={fee.id} className="flex justify-between gap-4">
            <span className="text-zinc-600">{fee.name}</span>
            <span className="tabular-nums font-medium text-zinc-900">
              {formatCents(fee.amountCents)}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-4">
          <span className="text-zinc-600">{PLATFORM_FEE_LINE_LABEL}</span>
          <span className="tabular-nums font-medium text-zinc-900">
            {formatCents(data.serviceFeeCents)}
          </span>
        </li>
        <li className="flex justify-between gap-4 border-t border-[rgba(17,24,39,0.12)] pt-3 text-base font-semibold text-zinc-900">
          <span>{data.state === "unpaid" ? "Total" : "Total paid (USD)"}</span>
          <span className="tabular-nums">{formatCents(data.totalAmountCents)}</span>
        </li>
      </ul>
      {paidOn && <p className="!mb-0 mt-3 text-xs text-zinc-500">Charged on {paidOn}</p>}
    </section>
  );
}

export function BookingSuccessClient({ sessionId, initial }: Props) {
  const [data, setData] = useState(initial);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (initial.state !== "pending") return;
    let cancelled = false;

    async function run() {
      for (let attempt = 0; attempt < MAX_POLLS && !cancelled; attempt += 1) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelled) return;
        try {
          const res = await fetch(`/api/bookings/lookup?session_id=${encodeURIComponent(sessionId)}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const next = (await res.json()) as BookingConfirmation;
            if (cancelled) return;
            setData(next);
            if (next.state !== "pending") return;
          }
        } catch {
          // Network blip — keep polling.
        }
      }
      if (!cancelled) setTimedOut(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [initial.state, sessionId]);

  const profileHref = `/instructors/${data.vendorSlug}`;

  return (
    <div>
      <Hero data={data} timedOut={timedOut} />

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="space-y-6">
          {data.state !== "unpaid" && <ConfirmationCodeCard data={data} />}

          <section className={CARD_CLASS}>
            <p className="!mb-0 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Your class
            </p>
            <h2 className="!mb-0 mt-1 !text-xl !font-semibold !leading-tight text-zinc-900 sm:!text-2xl">{data.classTitle}</h2>
            <p className="!mb-0 mt-1 text-sm text-zinc-600">
              with{" "}
              <Link href={profileHref} className="font-medium !text-[#C1440E] hover:underline">
                {data.vendorName}
              </Link>
            </p>

            <dl className="mt-6 space-y-4 border-t border-[rgba(17,24,39,0.08)] pt-5">
              <DetailRow icon="calendar" label="Date">
                {classDateLabel(data)}
              </DetailRow>
              <DetailRow icon="clock" label="Time">
                {classTimeLabel(data)}
              </DetailRow>
              <DetailRow icon="pin" label="Location">
                {data.location ?? `${data.vendorName} will send location details before class.`}
              </DetailRow>
            </dl>

            {data.state !== "unpaid" && (
              <a
                href={googleCalendarUrl(data)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-[rgba(17,24,39,0.15)] px-3.5 py-1.5 text-xs font-medium !text-[#141413] transition-colors hover:border-[#141413] print:hidden"
              >
                <Icon type="calendar" className="h-4 w-4" />
                Add to Google Calendar
              </a>
            )}
          </section>

          <section className={CARD_CLASS}>
            <h2 className="!mb-0 !text-base !font-semibold !leading-snug text-zinc-900">Booked by</h2>
            <dl className="mt-4 space-y-4">
              <DetailRow icon="user" label="Student">
                <span className="block">{data.customerName || "—"}</span>
                {data.customerEmail && (
                  <span className="block text-zinc-600">{data.customerEmail}</span>
                )}
              </DetailRow>
            </dl>
          </section>

          {data.state !== "unpaid" && (
            <section className={CARD_CLASS}>
              <h2 className="!mb-0 !text-base !font-semibold !leading-snug text-zinc-900">What happens next</h2>
              <ol className="mt-4 list-decimal space-y-3 text-sm text-zinc-700 marker:font-semibold marker:text-[#C1440E]" style={{ margin: "1rem 0 0", paddingLeft: "1.25rem" }}>
                <li>Check your inbox for a confirmation email with your class details.</li>
                <li>
                  Review{" "}
                  <Link
                    href={`${profileHref}?tab=what-to-bring`}
                    className="font-medium !text-[#C1440E] hover:underline"
                  >
                    what to bring
                  </Link>{" "}
                  — at minimum, a valid photo ID.
                </li>
                <li>
                  Questions before class? Reply to the confirmation email and include your
                  confirmation number.
                </li>
              </ol>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-offset)+1rem)] lg:self-start">
          <PaymentSummary data={data} />
          <div className="space-y-3 print:hidden">
            {data.state === "unpaid" ? (
              <Link
                href={`${profileHref}/book`}
                className="btn-primary bg-secondary-2 small w-button block w-full text-center"
              >
                Return to booking
              </Link>
            ) : (
              <Link
                href={profileHref}
                className="btn-primary bg-secondary-2 small w-button block w-full text-center"
              >
                Back to {data.vendorName}
              </Link>
            )}
            {data.state === "confirmed" && (
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full !rounded-lg !border !border-solid !border-[rgba(17,24,39,0.15)] !bg-white px-4 py-2.5 text-sm font-medium !text-[#141413] transition-colors hover:!border-[#141413]"
              >
                Print receipt
              </button>
            )}
            {timedOut && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full !rounded-lg !border !border-solid !border-[rgba(17,24,39,0.15)] !bg-white px-4 py-2.5 text-sm font-medium !text-[#141413] transition-colors hover:!border-[#141413]"
              >
                Check again
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
