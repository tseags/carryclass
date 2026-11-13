"use client";

import { useEffect, useState } from "react";

type SessionDto = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  title: string | null;
  classType: string;
  priceCents: number;
  spotsLeft: number;
  timezone: string;
};

type BookingDto = {
  id: string;
  confirmationCode: string | null;
  customerName: string;
  customerEmail: string;
  vendorName: string;
  vendorSlug: string;
  currentSession: SessionDto;
  previousSession?: SessionDto;
};

function classTypeLabel(classType: string, title: string | null): string {
  if (title?.trim()) return title.trim();
  if (classType === "initial") return "16-Hour Initial CCW";
  if (classType === "renewal") return "8-Hour Renewal";
  return classType;
}

function formatSession(session: SessionDto): { date: string; time: string } {
  const startsAt = new Date(session.startsAt);
  const tz = session.timezone || "America/Los_Angeles";
  const opts = { timeZone: tz } as const;
  try {
    return {
      date: new Intl.DateTimeFormat("en-US", {
        ...opts,
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(startsAt),
      time: new Intl.DateTimeFormat("en-US", {
        ...opts,
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(startsAt),
    };
  } catch {
    return {
      date: startsAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: startsAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  }
}

export function RescheduleClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<BookingDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reschedule/${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          message?: string;
          error?: string;
          booking?: BookingDto;
          eligibleSessions?: SessionDto[];
        };
        if (!res.ok) {
          if (!cancelled) {
            setError(data.message || "This reschedule link is no longer valid.");
            setBooking(null);
            setSessions([]);
          }
          return;
        }
        if (!cancelled) {
          setBooking(data.booking ?? null);
          setSessions(data.eligibleSessions ?? []);
        }
      } catch {
        if (!cancelled) setError("Could not load this reschedule link. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onConfirm() {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reschedule/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSessionId: selectedId }),
      });
      const data = (await res.json()) as {
        error?: string;
        booking?: BookingDto;
      };
      if (!res.ok) {
        setError(data.error || "Could not reschedule. Try another time.");
        if (res.status === 409) {
          const refresh = await fetch(`/api/reschedule/${encodeURIComponent(token)}`);
          if (refresh.ok) {
            const next = (await refresh.json()) as {
              booking?: BookingDto;
              eligibleSessions?: SessionDto[];
            };
            setBooking(next.booking ?? booking);
            setSessions(next.eligibleSessions ?? []);
            setSelectedId(null);
          }
        }
        return;
      }
      if (data.booking) setSuccess(data.booking);
    } catch {
      setError("Could not reschedule. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        <p className="!m-0 text-sm text-[#5C554C]">Loading your reschedule options…</p>
      </div>
    );
  }

  if (success) {
    const next = formatSession(success.currentSession);
    return (
      <div className="rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        <h1 className="!m-0 !text-2xl !font-semibold !text-[#141413]">You’re rescheduled</h1>
        <p className="!mt-2 !mb-0 text-sm text-[#5C554C]">
          Your spot with {success.vendorName} is confirmed for the new time. No extra payment was
          charged.
        </p>
        <div className="mt-5 rounded-xl bg-[#f2efe8] px-4 py-3 text-sm text-[#141413]">
          <p className="!m-0 font-medium">
            {classTypeLabel(success.currentSession.classType, success.currentSession.title)}
          </p>
          <p className="!m-0 !mt-1">
            {next.date} · {next.time}
          </p>
          {success.confirmationCode && (
            <p className="!m-0 !mt-2 font-mono text-xs tracking-wider text-[#5C554C]">
              Confirmation # {success.confirmationCode}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        <h1 className="!m-0 !text-2xl !font-semibold !text-[#141413]">Link unavailable</h1>
        <p className="!mt-2 !mb-0 text-sm text-[#5C554C]">{error}</p>
      </div>
    );
  }

  if (!booking) return null;

  const current = formatSession(booking.currentSession);

  return (
    <div className="rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)] sm:p-7">
      <h1 className="!m-0 !text-2xl !font-semibold !text-[#141413]">Pick a new class time</h1>
      <p className="!mt-2 !mb-0 text-sm text-[#5C554C]">
        {booking.vendorName} invited you to move your booking. Your payment stays the same.
      </p>

      <div className="mt-5 rounded-xl bg-[#f2efe8] px-4 py-3 text-sm text-[#141413]">
        <p className="!m-0 text-xs font-semibold uppercase tracking-wide text-[#7A7268]">
          Current class
        </p>
        <p className="!m-0 !mt-1 font-medium">
          {classTypeLabel(booking.currentSession.classType, booking.currentSession.title)}
        </p>
        <p className="!m-0 !mt-0.5">
          {current.date} · {current.time}
        </p>
        {booking.confirmationCode && (
          <p className="!m-0 !mt-2 font-mono text-xs tracking-wider text-[#5C554C]">
            Confirmation # {booking.confirmationCode}
          </p>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="!mt-6 !mb-0 text-sm text-[#5C554C]">
          No other open classes right now — contact your instructor.
        </p>
      ) : (
        <>
          <p className="!mt-6 !mb-2 text-sm font-medium text-[#141413]">Available times</p>
          <ul className="space-y-2">
            {sessions.map((session) => {
              const label = formatSession(session);
              const selected = selectedId === session.id;
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(session.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? "border-[#C1440E] bg-[#C1440E]/5"
                        : "border-[rgba(17,24,39,0.12)] bg-[#fefcf9] hover:border-[rgba(17,24,39,0.22)]"
                    }`}
                  >
                    <span className="block text-sm font-medium text-[#141413]">{label.date}</span>
                    <span className="mt-0.5 block text-sm text-[#5C554C]">
                      {label.time}
                      {session.spotsLeft <= 3
                        ? ` · ${session.spotsLeft} spot${session.spotsLeft === 1 ? "" : "s"} left`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {error && <p className="!mt-4 !mb-0 text-sm text-red-700">{error}</p>}

          <button
            type="button"
            disabled={!selectedId || submitting}
            onClick={() => void onConfirm()}
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#C1440E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A93B0C] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Moving your spot…" : "Confirm new time"}
          </button>
        </>
      )}
    </div>
  );
}
