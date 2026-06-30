"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VendorProfile } from "@/lib/onboarding-db";

type Policy = "none" | "anytime" | "full_hours_before" | "partial_hours_before";

const HOUR_OPTIONS = [12, 24, 48, 72];
const REFUND_OPTIONS = [25, 50, 75];

interface CancellationFields {
  cancellation_policy: string;
  cancellation_hours: number | null;
  cancellation_refund_percent: number | null;
}

interface Props {
  vendor: Pick<VendorProfile, "cancellation_policy" | "cancellation_hours" | "cancellation_refund_percent">;
  /**
   * "onboarding" (default) navigates to the next step on save. "dashboard"
   * stays put, surfaces a saved state, and reports the persisted policy via
   * `onSaved` so the dashboard can refresh its local state in place.
   */
  mode?: "onboarding" | "dashboard";
  onSaved?: (fields: CancellationFields) => void;
}

export function Step4Cancellation({ vendor, mode = "onboarding", onSaved }: Props) {
  const router = useRouter();
  const isDashboard = mode === "dashboard";
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [policy, setPolicy] = useState<Policy | "">(
    (vendor.cancellation_policy as Policy) ?? ""
  );
  const [hours, setHours] = useState(vendor.cancellation_hours ?? 24);
  const [refundPercent, setRefundPercent] = useState(vendor.cancellation_refund_percent ?? 50);

  function previewSentence(): string {
    if (policy === "full_hours_before") {
      return `Students who cancel at least ${hours} hours before class receive a full refund.`;
    }
    if (policy === "partial_hours_before") {
      return `Students who cancel at least ${hours} hours before class receive a ${refundPercent}% refund.`;
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!policy) {
      setError("Please select a cancellation policy.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError("");
    const nextHours = ["full_hours_before", "partial_hours_before"].includes(policy) ? hours : null;
    const nextRefund = policy === "partial_hours_before" ? refundPercent : null;
    try {
      const res = await fetch("/api/onboarding/step/4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy,
          hours: nextHours,
          refundPercent: nextRefund,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      if (isDashboard) {
        onSaved?.({
          cancellation_policy: policy,
          cancellation_hours: nextHours,
          cancellation_refund_percent: nextRefund,
        });
        setSaved(true);
      } else {
        router.push("/onboard/step/5");
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* No refunds */}
      <PolicyOption
        id="none"
        selected={policy === "none"}
        onSelect={() => setPolicy("none")}
        label="No refunds"
        description="All sales are final"
      />

      {/* Full refund anytime */}
      <PolicyOption
        id="anytime"
        selected={policy === "anytime"}
        onSelect={() => setPolicy("anytime")}
        label="Full refund anytime"
        description="Students can cancel anytime before the class for a full refund"
      />

      {/* Full refund up to X hours */}
      <div
        className={`rounded-xl border-2 transition-colors ${
          policy === "full_hours_before" ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
        }`}
      >
        <label className="flex items-start gap-3 p-4 cursor-pointer">
          <input
            type="radio"
            name="policy"
            value="full_hours_before"
            checked={policy === "full_hours_before"}
            onChange={() => setPolicy("full_hours_before")}
            className="mt-0.5 w-4 h-4 border-zinc-300 text-zinc-900"
          />
          <div className="flex-1">
            <p className="font-medium text-zinc-800">Full refund up to X hours before class</p>
            {policy === "full_hours_before" && (
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="input-field w-24 text-sm"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h} hours</option>
                  ))}
                </select>
                <span className="text-sm text-zinc-500">before class</span>
              </div>
            )}
          </div>
        </label>
        {policy === "full_hours_before" && (
          <div className="px-4 pb-4">
            <p className="text-sm text-zinc-600 bg-zinc-100 rounded-lg px-3 py-2">
              {previewSentence()}
            </p>
          </div>
        )}
      </div>

      {/* Partial refund */}
      <div
        className={`rounded-xl border-2 transition-colors ${
          policy === "partial_hours_before" ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
        }`}
      >
        <label className="flex items-start gap-3 p-4 cursor-pointer">
          <input
            type="radio"
            name="policy"
            value="partial_hours_before"
            checked={policy === "partial_hours_before"}
            onChange={() => setPolicy("partial_hours_before")}
            className="mt-0.5 w-4 h-4 border-zinc-300 text-zinc-900"
          />
          <div className="flex-1">
            <p className="font-medium text-zinc-800">Partial refund up to X hours before class</p>
            {policy === "partial_hours_before" && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="input-field w-24 text-sm"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h} hours</option>
                  ))}
                </select>
                <span className="text-sm text-zinc-500">before class →</span>
                <select
                  value={refundPercent}
                  onChange={(e) => setRefundPercent(Number(e.target.value))}
                  className="input-field w-24 text-sm"
                >
                  {REFUND_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}% refund</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </label>
        {policy === "partial_hours_before" && (
          <div className="px-4 pb-4">
            <p className="text-sm text-zinc-600 bg-zinc-100 rounded-lg px-3 py-2">
              {previewSentence()}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div
        className={`flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center ${
          isDashboard ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!isDashboard && (
          <button
            type="button"
            onClick={() => router.push("/onboard/step/3")}
            className="btn-secondary w-button"
          >
            Back
          </button>
        )}
        <div className="flex items-center justify-end gap-3">
          {isDashboard && saved && !saving && (
            <span className="text-sm font-medium text-emerald-600">Saved ✓</span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-button inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Spinner />}
            {saving ? "Saving…" : isDashboard ? "Save changes" : "Save & Continue"}
          </button>
        </div>
      </div>
    </form>
  );
}

function PolicyOption({
  id,
  selected,
  onSelect,
  label,
  description,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
        selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <input
        type="radio"
        name="policy"
        value={id}
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 w-4 h-4 border-zinc-300 text-zinc-900"
      />
      <div>
        <p className="font-medium text-zinc-800">{label}</p>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
