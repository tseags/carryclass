"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { VendorClassType } from "@/lib/onboarding-db";

const CLASS_TYPES = [
  { key: "initial", label: "CCW Initial License", description: "16-hour course for first-time applicants" },
  { key: "renewal", label: "CCW Renewal", description: "8-hour renewal course" },
  { key: "add_a_gun", label: "Add-A-Gun", description: "Add a new firearm to your permit" },
];

interface Props {
  existingTypes: VendorClassType[];
}

interface TypeState {
  enabled: boolean;
  price: string;
}

export function Step2ClassTypes({ existingTypes }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [types, setTypes] = useState<Record<string, TypeState>>(() => {
    const state: Record<string, TypeState> = {};
    for (const ct of CLASS_TYPES) {
      const existing = existingTypes.find((t) => t.class_type === ct.key);
      state[ct.key] = {
        enabled: existing ? existing.is_active : false,
        price: existing ? String(existing.price) : "",
      };
    }
    return state;
  });

  // Update indeterminate state on select-all checkbox
  const enabledCount = Object.values(types).filter((t) => t.enabled).length;
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = enabledCount > 0 && enabledCount < CLASS_TYPES.length;
    selectAllRef.current.checked = enabledCount === CLASS_TYPES.length;
  }, [enabledCount]);

  function handleSelectAll(checked: boolean) {
    setTypes((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, { ...v, enabled: checked }])
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const activeTypes = Object.entries(types).filter(([, v]) => v.enabled);
    if (!activeTypes.length) {
      setError("Please select at least one class type.");
      return;
    }

    for (const [key, val] of activeTypes) {
      if (!val.price || isNaN(Number(val.price)) || Number(val.price) <= 0) {
        const label = CLASS_TYPES.find((c) => c.key === key)?.label;
        setError(`Please enter a valid price for ${label}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const classTypes = CLASS_TYPES.map((ct) => ({
        class_type: ct.key,
        price: Number(types[ct.key].price) || 0,
        is_active: types[ct.key].enabled,
      })).filter((ct) => ct.is_active || existingTypes.some((e) => e.class_type === ct.class_type));

      const res = await fetch("/api/onboarding/step/2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classTypes }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/onboard/step/3");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Select all */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          ref={selectAllRef}
          type="checkbox"
          className="w-4 h-4 rounded border-zinc-300 text-zinc-900 cursor-pointer"
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
        <span className="text-sm font-medium text-zinc-700">Select all</span>
      </label>

      <div className="space-y-4">
        {CLASS_TYPES.map((ct) => {
          const state = types[ct.key];
          return (
            <div
              key={ct.key}
              className={`rounded-xl border transition-colors ${
                state.enabled ? "border-zinc-800 bg-white" : "border-zinc-200 bg-white"
              }`}
            >
              <label className="flex items-start gap-4 p-4 cursor-pointer">
                {/* Toggle switch */}
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    onChange={(e) =>
                      setTypes((prev) => ({
                        ...prev,
                        [ct.key]: { ...prev[ct.key], enabled: e.target.checked },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-zinc-800">{ct.label}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{ct.description}</p>
                </div>
              </label>

              {state.enabled && (
                <div className="px-4 pb-4 pt-0">
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Price per student ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={state.price}
                      onChange={(e) =>
                        setTypes((prev) => ({
                          ...prev,
                          [ct.key]: { ...prev[ct.key], price: e.target.value },
                        }))
                      }
                      placeholder="0.00"
                      required
                      className="input-field pl-7 w-40"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={() => router.push("/onboard/step/1")}
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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
