"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VendorProfile } from "@/lib/onboarding-db";

type Policy = "none" | "anytime" | "full_hours_before" | "partial_hours_before";

const HOUR_OPTIONS = [12, 24, 48, 72];
const REFUND_OPTIONS = [25, 50, 75];

interface Props {
  vendor: Pick<VendorProfile, "cancellation_policy" | "cancellation_hours" | "cancellation_refund_percent">;
}

export function Step4Cancellation({ vendor }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
    setError("");
    try {
      const res = await fetch("/api/onboarding/step/4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy,
          hours: ["full_hours_before", "partial_hours_before"].includes(policy) ? hours : null,
          refundPercent: policy === "partial_hours_before" ? refundPercent : null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/onboard/step/5");
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

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push("/onboard/step/3")}
          className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-zinc-700 disabled:opacity-60 transition-colors"
        >
          {saving && <Spinner />}
          Save &amp; Continue →
        </button>
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
