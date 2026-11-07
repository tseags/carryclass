"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "@/components/dashboard/Drawer";
import { getCountyDisplayName } from "@/data/counties";
import type { OutreachActivityView, OutreachContactView } from "@/lib/outreach/contacts";
import {
  DISPOSITION_LABELS,
  OUTREACH_STAGES,
  STAGE_LABELS,
  formatDayShort,
  stageAfterEmail,
  suggestedStep,
  type OutreachStageId,
} from "@/lib/outreach/sequence";
import { pacificDayKey } from "@/lib/payments-time";
import {
  BOOKING_TOOLS,
  BOOKING_TOOL_LABELS,
  WEBSITE_BOOKING_OPTIONS,
  WEBSITE_BOOKING_LABELS,
  websiteBookingFromTags,
  type BookingTool,
  type WebsiteBookingOption,
} from "@/lib/outreach/booking";
import { OutreachCallPanel, type LogCallInput } from "./OutreachCallPanel";
import { OutreachZohoThread } from "./OutreachZohoThread";
import {
  TAG_LABELS,
  formatDuration,
  secondaryButtonClass,
  selectClass,
  stagePill,
  websiteHost,
} from "./outreach-ui";

type Detail = { contact: OutreachContactView; activities: OutreachActivityView[] };

const timestamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-gray-100 px-5 py-4 last:border-0">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">{title}</h3>
      {children}
    </section>
  );
}

export function OutreachContactDrawer({
  contact,
  onClose,
  onContactChange,
  voiceMissing,
  zohoMissing,
  callerId,
}: {
  contact: OutreachContactView | null;
  onClose: () => void;
  onContactChange: (contact: OutreachContactView) => void;
  voiceMissing: string[];
  zohoMissing: string[];
  callerId: string | null;
}) {
  const [activities, setActivities] = useState<OutreachActivityView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const callActive = useRef(false);
  const contactId = contact?.id ?? null;

  useEffect(() => {
    setActivities(null);
    setError(null);
    setNote("");
    if (!contactId) return;
    let cancelled = false;
    fetch(`/api/outreach/contacts/${contactId}`)
      .then((res) => (res.ok ? (res.json() as Promise<Detail>) : Promise.reject()))
      .then((detail) => !cancelled && setActivities(detail.activities))
      .catch(() => !cancelled && setError("Couldn't load this instructor's history."));
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const apply = useCallback(
    (detail: Detail) => {
      onContactChange(detail.contact);
      setActivities(detail.activities);
    },
    [onContactChange]
  );

  async function send(label: string, url: string, init: RequestInit): Promise<void> {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json" },
      });
      const json = (await res.json().catch(() => ({}))) as Detail & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      apply(json);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
      throw e;
    } finally {
      setBusy(null);
    }
  }

  const postActivity = (label: string, body: Record<string, unknown>) =>
    send(label, `/api/outreach/contacts/${contactId}/activities`, {
      method: "POST",
      body: JSON.stringify(body),
    });

  const patchContact = (label: string, body: Record<string, unknown>) =>
    send(label, `/api/outreach/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).catch(() => {});

  const loggedMessageIds = useMemo(
    () => new Set((activities ?? []).map((a) => a.zohoMessageId).filter((id): id is string => Boolean(id))),
    [activities]
  );

  const onActiveChange = useCallback((active: boolean) => {
    callActive.current = active;
  }, []);

  function guardedClose() {
    if (callActive.current && !window.confirm("You're on a call. Hang up and close?")) return;
    onClose();
  }

  const c = contact;
  const dnc = Boolean(c && (c.doNotContact || c.stage === "do_not_contact"));
  const afterEmail = c ? stageAfterEmail({ stage: c.stage, nextActionAt: null }) : null;

  return (
    <Drawer open={c !== null} onClose={guardedClose} title={c?.displayName ?? "Instructor"}>
      {c && (
        <div className="text-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stagePill(c.stage)}`}>
                {STAGE_LABELS[c.stage]}
              </span>
              {c.bookingTool && (
                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                  {BOOKING_TOOL_LABELS[c.bookingTool as BookingTool] ?? c.bookingTool}
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-600">
              {c.counties.length > 0
                ? c.counties.map((s) => getCountyDisplayName(s)).join(", ")
                : "No county on file"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                  {TAG_LABELS[t] ?? t}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {c.website && (
                <a
                  href={c.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[#C1440E] hover:underline"
                >
                  {websiteHost(c.website)} ↗
                </a>
              )}
              {c.directorySlug && (
                <a
                  href={`/instructors/${c.directorySlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[#C1440E] hover:underline"
                >
                  CarryClass listing ↗
                </a>
              )}
            </div>
          </div>

          <Section title="Contact">
            <dl className="space-y-3">
              {c.instructorNames.length > 0 && (
                <div>
                  <dt className="text-xs text-gray-500">Instructors</dt>
                  <dd className="text-gray-900">{c.instructorNames.join(", ")}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500">Email</dt>
                <dd>
                  {c.emails.length === 0 ? (
                    <span className="text-gray-400">None on file</span>
                  ) : (
                    c.emails.map((e) => (
                      <a key={e} href={`mailto:${e}`} className="block text-[#C1440E] hover:underline">
                        {e}
                      </a>
                    ))
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Address</dt>
                <dd className="text-gray-900">
                  {c.addresses.length === 0 ? (
                    <span className="text-gray-400">None on file</span>
                  ) : (
                    c.addresses.map((a) => <span key={a} className="block">{a}</span>)
                  )}
                </dd>
              </div>
              {c.city && (
                <div>
                  <dt className="text-xs text-gray-500">City</dt>
                  <dd className="text-gray-900">{c.city}</dd>
                </div>
              )}
            </dl>
          </Section>

          <Section title="Website booking">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[180px] flex-1">
                <span className="mb-1 block text-xs text-gray-500">Booking on their site</span>
                <select
                  value={websiteBookingFromTags(c.tags) ?? ""}
                  disabled={busy === "listing"}
                  onChange={(e) =>
                    patchContact("listing", {
                      websiteBooking: e.target.value as WebsiteBookingOption,
                    })
                  }
                  className={`${selectClass} w-full`}
                >
                  <option value="" disabled>
                    Not set
                  </option>
                  {WEBSITE_BOOKING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {WEBSITE_BOOKING_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[180px] flex-1">
                <span className="mb-1 block text-xs text-gray-500">Booking tool</span>
                <select
                  value={c.bookingTool ?? ""}
                  disabled={busy === "listing"}
                  onChange={(e) =>
                    patchContact("listing", {
                      bookingTool: e.target.value ? (e.target.value as BookingTool) : null,
                    })
                  }
                  className={`${selectClass} w-full`}
                >
                  <option value="">Not set</option>
                  {BOOKING_TOOLS.map((tool) => (
                    <option key={tool} value={tool}>
                      {BOOKING_TOOL_LABELS[tool]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {c.bookingCapabilityLocked && (
              <p className="mt-2 text-xs text-gray-500">
                Website booking is locked so directory sync won’t overwrite it.
              </p>
            )}
          </Section>

          <Section title="Next step">
            <p className="font-medium text-gray-900">{suggestedStep(c.stage)}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">Stage</span>
                <select
                  value={c.stage}
                  disabled={busy === "stage"}
                  onChange={(e) =>
                    patchContact("stage", { stage: e.target.value as OutreachStageId })
                  }
                  className={selectClass}
                >
                  {OUTREACH_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gray-500">Next action</span>
                <input
                  type="date"
                  value={c.nextActionAt ? pacificDayKey(c.nextActionAt) : ""}
                  disabled={busy === "stage"}
                  onChange={(e) =>
                    patchContact("stage", { nextActionDay: e.target.value || null })
                  }
                  className={selectClass}
                />
              </label>
            </div>
          </Section>

          <Section title="Call">
            <OutreachCallPanel
              key={c.id}
              contactId={c.id}
              phones={c.phones}
              stage={c.stage}
              disabled={dnc}
              voiceMissing={voiceMissing}
              callerId={callerId}
              onActiveChange={onActiveChange}
              onLog={(input: LogCallInput) => postActivity("call", { type: "call", ...input })}
            />
          </Section>

          <Section title="Email">
            {dnc ? (
              <p className="text-gray-500">Email is off for contacts marked do not contact.</p>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy === "email"}
                  onClick={() => postActivity("email", { type: "email" }).catch(() => {})}
                  className={secondaryButtonClass}
                >
                  {busy === "email" ? "Saving…" : "I emailed them"}
                </button>
                {afterEmail && afterEmail.stage !== c.stage && (
                  <p className="mt-2 text-xs text-gray-500">
                    Moves this to {STAGE_LABELS[afterEmail.stage]}
                    {afterEmail.nextActionAt
                      ? ` and sets the follow-up call for ${formatDayShort(afterEmail.nextActionAt)}`
                      : ""}
                    .
                  </p>
                )}
              </>
            )}
          </Section>

          <Section title="Notes & activity">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30"
            />
            <button
              type="button"
              disabled={!note.trim() || busy === "note"}
              onClick={() =>
                postActivity("note", { type: "note", body: note })
                  .then(() => setNote(""))
                  .catch(() => {})
              }
              className={`mt-2 ${secondaryButtonClass}`}
            >
              {busy === "note" ? "Saving…" : "Add note"}
            </button>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <ActivityTimeline activities={activities} />
          </Section>

          <Section title="Zoho Mail">
            {zohoMissing.length > 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Zoho not connected. Missing: {zohoMissing.join(", ")}.
              </p>
            ) : (
              <OutreachZohoThread
                contactId={c.id}
                emails={c.emails}
                loggedMessageIds={loggedMessageIds}
                onLogSent={(m) =>
                  postActivity("email", {
                    type: "email",
                    body: `Sent: ${m.subject}`,
                    zohoMessageId: m.messageId,
                  })
                }
              />
            )}
          </Section>
        </div>
      )}
    </Drawer>
  );
}

function activityTitle(a: OutreachActivityView): string {
  switch (a.type) {
    case "call":
      return [
        "Call",
        a.disposition ? DISPOSITION_LABELS[a.disposition] : null,
        formatDuration(a.durationSeconds),
        a.phone,
      ]
        .filter(Boolean)
        .join(" · ");
    case "email":
      return "Email sent";
    case "note":
      return "Note";
    case "stage_change":
      return `Stage: ${a.fromStage ? STAGE_LABELS[a.fromStage] : "—"} → ${
        a.toStage ? STAGE_LABELS[a.toStage] : "—"
      }`;
  }
}

function ActivityTimeline({ activities }: { activities: OutreachActivityView[] | null }) {
  if (activities === null) return <p className="mt-4 text-gray-500">Loading history…</p>;
  if (activities.length === 0) return <p className="mt-4 text-gray-500">No activity yet.</p>;
  return (
    <ol className="mt-4 space-y-3 border-l-2 border-[#C1440E]/20 pl-4">
      {activities.map((a) => (
        <li key={a.id}>
          <p className={a.type === "stage_change" ? "text-gray-500" : "font-medium text-gray-900"}>
            {activityTitle(a)}
          </p>
          {a.body && <p className="mt-0.5 whitespace-pre-wrap text-gray-700">{a.body}</p>}
          <p className="mt-0.5 text-xs text-gray-400">{timestamp.format(new Date(a.occurredAt))}</p>
        </li>
      ))}
    </ol>
  );
}
