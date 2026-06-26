"use client";

import { useEffect, useState } from "react";
import type { VendorEmailTemplate } from "@/lib/onboarding-db";
import { Drawer } from "./Drawer";

export type EmailTemplateType = "confirmation" | "reminder" | "followup";

// Mirrors the merge tags used by /api/generate-email-templates and email
// rendering — keep single-brace syntax so saved templates render correctly.
const MERGE_TAGS = ["{student_name}", "{class_date}", "{instructor_name}"];

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

interface Props {
  open: boolean;
  onClose: () => void;
  type: EmailTemplateType | null;
  template: Partial<VendorEmailTemplate> | undefined;
  onSaved: (type: EmailTemplateType, fields: Partial<VendorEmailTemplate>) => void;
  vendorId: string;
}

export function EmailEditorDrawer({ open, onClose, type, template, onSaved, vendorId }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendTiming, setSendTiming] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<null | "sending" | "sent" | "error">(null);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    if (!open || !type) return;
    setSubject(template?.subject ?? "");
    setBody(template?.body ?? "");
    setIsActive(template?.is_active ?? true);
    setSendTiming(
      template?.send_timing ?? (type === "reminder" ? "24h_before" : "1d_after")
    );
    setSaved(false);
    setTestStatus(null);
    setTestMessage("");
  }, [open, type, template]);

  if (!type) return null;

  const isConfirmation = type === "confirmation";
  const timingOptions = isConfirmation ? [] : TIMING_OPTIONS[type];

  function insertTag(tag: string) {
    setBody((b) => b + tag);
  }

  async function handleSave() {
    if (!type) return;
    setSaving(true);
    setSaved(false);
    try {
      const fields: Partial<VendorEmailTemplate> = {
        subject,
        body,
        is_active: isConfirmation ? true : isActive,
        send_timing: isConfirmation ? null : sendTiming,
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
        body: JSON.stringify({ subject, body }),
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Edit: ${TYPE_LABELS[type]}`}
      footer={
        <div className="flex flex-col gap-2">
          {testMessage && (
            <p
              className={`text-xs ${
                testStatus === "error" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {testMessage}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testStatus === "sending" || !subject || !body}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {testStatus === "sending" ? "Sending…" : "Send Test Email"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#C1440E] px-4 py-2 text-sm font-medium text-white hover:bg-[#a53a0c] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        {!isConfirmation && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Email enabled</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
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
                Send timing
              </label>
              <select
                value={sendTiming}
                onChange={(e) => setSendTiming(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
              >
                {timingOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#C1440E] focus:outline-none focus:ring-1 focus:ring-[#C1440E]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
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
    </Drawer>
  );
}
