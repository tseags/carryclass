"use client";

import { useEffect, useState } from "react";
import type { VendorEmailTemplate } from "@/lib/onboarding-db";
import {
  DEFAULT_EMAIL_TEMPLATES,
  MERGE_TAGS,
  resolveTemplateContent,
  type EmailTemplateType,
} from "@/lib/email-templates-defaults";
import { DEFAULT_FROM_EMAIL, VERIFIED_SENDING_DOMAIN } from "@/lib/email-from";

export type { EmailTemplateType };

const TIMING_OPTIONS: Record<Exclude<EmailTemplateType, "confirmation">, { value: string; label: string }[]> = {
  reminder: [
    { value: "24h_before", label: "24 hours before" },
    { value: "48h_before", label: "48 hours before" },
    { value: "1w_before", label: "1 week before" },
  ],
  followup: [
    { value: "1d_after", label: "1 day after" },
    { value: "3d_after", label: "3 days after" },
    { value: "7d_after", label: "7 days after" },
  ],
};

const TYPE_LABELS: Record<EmailTemplateType, string> = {
  confirmation: "Booking Confirmation",
  reminder: "Class Reminder",
  followup: "Post-Class Follow-Up",
};

const TYPE_DESCRIPTIONS: Record<EmailTemplateType, string> = {
  confirmation: "Sent immediately when a student books a class.",
  reminder: "Sent before the class as a friendly reminder.",
  followup: "Sent after the class to thank students and invite a review.",
};

/** Convert an ISO timestamp to a value usable by <input type="datetime-local">. */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local value back to an ISO string (or null). */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
  type: EmailTemplateType;
  template: Partial<VendorEmailTemplate> | undefined;
  onClose: () => void;
  onSaved: (type: EmailTemplateType, fields: Partial<VendorEmailTemplate>) => void;
  vendorId: string;
  /** Instructor profile email — default "send from" address. */
  vendorEmail?: string | null;
}

/**
 * Full-tab email editor: a two-column split with the settings form on the left
 * and a live email preview on the right. Replaces the prior slide-over drawer.
 */
export function EmailEditorPanel({
  type,
  template,
  onClose,
  onSaved,
  vendorId,
  vendorEmail,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendTiming, setSendTiming] = useState("");
  const [sendMode, setSendMode] = useState<"relative" | "scheduled">("relative");
  const [scheduledAt, setScheduledAt] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<null | "sending" | "sent" | "error">(null);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    const content = resolveTemplateContent(type, template);
    setSubject(content.subject);
    setBody(content.body);
    setIsActive(template?.is_active ?? true);
    setSendTiming(
      template?.send_timing ?? (type === "reminder" ? "24h_before" : "1d_after")
    );
    setSendMode((template?.send_mode as "relative" | "scheduled") ?? "relative");
    setScheduledAt(isoToLocalInput(template?.scheduled_at));
    setFromEmail(template?.from_email ?? vendorEmail ?? "");
    setSaved(false);
    setTestStatus(null);
    setTestMessage("");
  }, [type, template, vendorEmail]);

  const isConfirmation = type === "confirmation";
  const timingOptions = isConfirmation ? [] : TIMING_OPTIONS[type];
  const usingDefaultContent = !template?.subject?.trim() && !template?.body?.trim();
  const fromIsVerified =
    !fromEmail.trim() ||
    fromEmail.trim().toLowerCase().endsWith(`@${VERIFIED_SENDING_DOMAIN}`);
  const resolvedFrom = fromIsVerified ? fromEmail.trim() || DEFAULT_FROM_EMAIL : DEFAULT_FROM_EMAIL;

  function insertTag(tag: string) {
    setBody((b) => b + tag);
  }

  function resetToDefault() {
    setSubject(DEFAULT_EMAIL_TEMPLATES[type].subject);
    setBody(DEFAULT_EMAIL_TEMPLATES[type].body);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const fields: Partial<VendorEmailTemplate> = {
        subject,
        body,
        is_active: isConfirmation ? true : isActive,
        send_timing: isConfirmation ? null : sendMode === "relative" ? sendTiming : null,
        send_mode: isConfirmation ? null : sendMode,
        scheduled_at: isConfirmation
          ? null
          : sendMode === "scheduled"
            ? localInputToIso(scheduledAt)
            : null,
        from_email: fromEmail.trim() || null,
      };
      await fetch("/api/onboarding/email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, type, ...fields }),
      });
      onSaved(type, fields);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    setTestStatus("sending");
    setTestMessage("");
    try {
      const res = await fetch("/api/dashboard/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, fromEmail: fromEmail.trim() || null, type }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus("sent");
        setTestMessage(data.sentTo ? `Test sent to ${data.sentTo}` : "Test email sent.");
      } else {
        setTestStatus("error");
        setTestMessage(data.error ?? "Unable to send test email.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Unable to send test email.");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]";

  return (
    <div className="space-y-6">
      {/* Header with back control */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{TYPE_LABELS[type]}</h1>
          <p className="text-sm text-gray-500">{TYPE_DESCRIPTIONS[type]}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: settings form ─────────────────────────────────────────── */}
        <div className="space-y-5">
          {usingDefaultContent && (
            <p className="rounded-lg bg-[#C1440E]/5 px-3 py-2 text-xs text-[#C1440E]">
              Showing a generic default template. Edit it below and save to make it yours.
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Send from</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder={vendorEmail ?? DEFAULT_FROM_EMAIL}
              className={inputClass}
            />
            {!fromIsVerified && (
              <p className="mt-1.5 text-xs text-amber-600">
                This address isn&apos;t on a verified domain, so emails will send from{" "}
                <span className="font-mono">{DEFAULT_FROM_EMAIL}</span> with your address as
                reply-to.
              </p>
            )}
          </div>

          {isConfirmation ? (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Always on
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Email enabled</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  aria-label="Toggle email enabled"
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative h-6 w-10 rounded-full transition-colors ${
                    isActive ? "bg-[#C1440E]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  When should this send?
                </label>
                <div className="mb-3 inline-flex rounded-lg border border-gray-300 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSendMode("relative")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sendMode === "relative"
                        ? "bg-[#C1440E] text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Relative to class
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("scheduled")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      sendMode === "scheduled"
                        ? "bg-[#C1440E] text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Specific date &amp; time
                  </button>
                </div>

                {sendMode === "relative" ? (
                  <select
                    value={sendTiming}
                    onChange={(e) => setSendTiming(e.target.value)}
                    className={inputClass}
                  >
                    {timingOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-amber-600">
                      Saved as your scheduling preference. Automated sending isn&apos;t live yet —
                      see the note on the Emails tab.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600">Subject</label>
              <button
                type="button"
                onClick={resetToDefault}
                className="text-xs font-medium text-gray-400 hover:text-[#C1440E] transition-colors"
              >
                Reset to default
              </button>
            </div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your email body here…"
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
            />
          </div>

          <div>
            <p className="mb-2 text-xs text-gray-400">Merge tags — click to insert:</p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: live preview ─────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Email Preview
              </span>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testStatus === "sending" || !subject || !body}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C1440E] hover:underline disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                {testStatus === "sending" ? "Sending…" : "Send test email"}
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="border-b border-gray-100 pb-4">
                <p className="text-xs text-gray-400">From</p>
                <p className="text-sm text-gray-700">{resolvedFrom}</p>
                <p className="mt-2 text-xs text-gray-400">Subject</p>
                <p className="text-base font-semibold text-gray-900">
                  {subject || <span className="text-gray-300">(no subject)</span>}
                </p>
              </div>
              <div className="whitespace-pre-wrap pt-4 text-sm leading-relaxed text-gray-700">
                {body || <span className="text-gray-300">(empty body)</span>}
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Merge tags like <span className="font-mono">{"{student_name}"}</span> are shown
            literally here and filled with real booking details when the email is sent.
          </p>

          {testMessage && (
            <p className={`mt-2 text-xs ${testStatus === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {testMessage}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={resetToDefault}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset to default
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#C1440E] px-6 py-2 text-sm font-medium text-white hover:bg-[#a53a0c] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
