"use client";

import { useState, useCallback } from "react";
import type { VendorEmailTemplate } from "@/lib/onboarding-db";

const MERGE_TAGS = [
  "{student_name}",
  "{class_type}",
  "{class_date}",
  "{class_time}",
  "{instructor_name}",
  "{location}",
  "{rebooking_link}",
];

const TIMING_OPTIONS = {
  reminder: [
    { value: "24h_before", label: "24 hours before" },
    { value: "48h_before", label: "48 hours before" },
    { value: "both", label: "24h and 48h before" },
  ],
  followup: [
    { value: "1d_after", label: "1 day after" },
    { value: "3d_after", label: "3 days after" },
    { value: "7d_after", label: "7 days after" },
  ],
};

interface TemplateState {
  subject: string;
  body: string;
  is_active: boolean;
  send_timing: string;
}

interface Props {
  type: "confirmation" | "reminder" | "followup";
  initial: Partial<VendorEmailTemplate>;
  onSave: (fields: Partial<VendorEmailTemplate>) => Promise<void>;
}

const TYPE_LABELS = {
  confirmation: "Booking confirmation",
  reminder: "Reminder email",
  followup: "Follow-up email",
};

const TYPE_DESCRIPTIONS = {
  confirmation: "Sent immediately when a student books a class. Required — always on.",
  reminder: "Sent before the class to remind the student.",
  followup: "Sent after the class to gather feedback or encourage rebooking.",
};

export function EmailTemplateEditor({ type, initial, onSave }: Props) {
  const [state, setState] = useState<TemplateState>({
    subject: initial.subject ?? "",
    body: initial.body ?? "",
    is_active: initial.is_active ?? true,
    send_timing: initial.send_timing ?? (type === "reminder" ? "24h_before" : "1d_after"),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const timingOptions = type === "reminder" ? TIMING_OPTIONS.reminder : TIMING_OPTIONS.followup;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({
        subject: state.subject,
        body: state.body,
        is_active: state.is_active,
        send_timing: state.send_timing,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [state, onSave]);

  function insertTag(tag: string) {
    setState((s) => ({ ...s, body: s.body + tag }));
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-800">{TYPE_LABELS[type]}</h3>
            {type === "confirmation" && (
              <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                Always on
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{TYPE_DESCRIPTIONS[type]}</p>
        </div>

        {type !== "confirmation" && (
          <label className="relative flex-shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={state.is_active}
              onChange={(e) => setState((s) => ({ ...s, is_active: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </label>
        )}
      </div>

      {/* Body */}
      <div className={`p-5 space-y-4 ${!state.is_active && type !== "confirmation" ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Timing selector */}
        {type !== "confirmation" && (
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Send timing
            </label>
            <select
              value={state.send_timing}
              onChange={(e) => setState((s) => ({ ...s, send_timing: e.target.value }))}
              className="input-field text-sm"
            >
              {timingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Subject</label>
          <input
            type="text"
            value={state.subject}
            onChange={(e) => setState((s) => ({ ...s, subject: e.target.value }))}
            onBlur={handleSave}
            placeholder="Email subject line"
            className="input-field w-full"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">Body</label>
          <textarea
            value={state.body}
            onChange={(e) => setState((s) => ({ ...s, body: e.target.value }))}
            onBlur={handleSave}
            rows={8}
            placeholder="Write your email body here..."
            className="input-field w-full resize-y font-mono text-sm"
          />
        </div>

        {/* Merge tags */}
        <div>
          <p className="text-xs text-zinc-400 mb-2">Available merge tags — click to insert:</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2 py-1 rounded hover:bg-zinc-200 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : saved ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
