"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { VendorCheckoutFee, VendorClassType } from "@/lib/onboarding-db";
import {
  classesIndexPath,
  classPagePath,
  isCustomClassKey,
} from "@/lib/instructor-catalog";
import { CopyClassLink } from "./CopyClassLink";
import {
  CheckoutFeesEditor,
  feeDraftsFromRows,
  feePayload,
  type FeeDraft,
} from "./CheckoutFeesEditor";
import { OtherClassesEditor, type CustomClassDraft } from "./OtherClassesEditor";

export const CLASS_TYPES = [
  { key: "initial", label: "CCW Initial", description: "16-hour course for first-time applicants" },
  { key: "renewal", label: "CCW Renewal", description: "8-hour renewal course" },
  { key: "add_a_gun", label: "Add-A-Gun", description: "Add a new firearm to your permit" },
];

interface Props {
  existingTypes: VendorClassType[];
  existingFees?: VendorCheckoutFee[];
  /**
   * "onboarding" (default) navigates to the next step on save. "dashboard"
   * stays put, surfaces a saved state, and reports the persisted class types
   * via `onSaved` so the dashboard can refresh its local state in place.
   * Dashboard saves do not advance onboarding_step.
   */
  mode?: "onboarding" | "dashboard";
  onSaved?: (classTypes: VendorClassType[]) => void;
  /** Claimed listing slug. Enables copy-link controls in the dashboard. */
  publicSlug?: string | null;
  /** Onboarding collects fees on this step. The dashboard uses a sibling form. */
  showCheckoutFees?: boolean;
}

interface TypeState {
  enabled: boolean;
  price: string;
}

function customDrafts(existingTypes: VendorClassType[]): CustomClassDraft[] {
  return existingTypes
    .filter((type) => isCustomClassKey(type.class_type))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((type) => ({
      class_type: type.class_type,
      name: type.display_name ?? "",
      description: type.description ?? "",
      price: type.price ? String(Number(type.price)) : "",
      active: type.is_active,
    }));
}

export function Step2ClassTypes({
  existingTypes,
  existingFees = [],
  mode = "onboarding",
  onSaved,
  publicSlug = null,
  showCheckoutFees,
}: Props) {
  const router = useRouter();
  const isDashboard = mode === "dashboard";
  const includeFees = showCheckoutFees ?? !isDashboard;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [customClasses, setCustomClasses] = useState<CustomClassDraft[]>(() =>
    customDrafts(existingTypes)
  );
  const [fees, setFees] = useState<FeeDraft[]>(() => feeDraftsFromRows(existingFees));

  const [types, setTypes] = useState<Record<string, TypeState>>(() => {
    const state: Record<string, TypeState> = {};
    for (const ct of CLASS_TYPES) {
      const existing = existingTypes.find((t) => t.class_type === ct.key);
      state[ct.key] = {
        enabled: existing ? existing.is_active : false,
        price: existing ? String(Number(existing.price) || "") : "",
      };
    }
    return state;
  });

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

  const feeClassOptions = [
    ...CLASS_TYPES.map((ct) => ({ key: ct.key, label: ct.label })),
    ...customClasses.map((row) => ({
      key: row.class_type,
      label: row.name.trim() || "Other class",
    })),
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    const activeTypes = Object.entries(types).filter(([, v]) => v.enabled);
    if (!activeTypes.length) {
      setError("Please select at least one CCW class type.");
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
      const classTypes = [
        ...CLASS_TYPES.map((ct) => ({
          class_type: ct.key,
          price: Number(types[ct.key].price) || 0,
          is_active: types[ct.key].enabled,
        })).filter((ct) => ct.is_active || existingTypes.some((row) => row.class_type === ct.class_type)),
        ...customClasses.map((row) => ({
          class_type: row.class_type,
          display_name: row.name,
          description: row.description,
          price: row.price === "" ? 0 : Number(row.price),
          is_active: row.active,
        })),
      ];

      const res = await fetch("/api/onboarding/step/2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classTypes,
          replaceCustom: true,
          mode: isDashboard ? "dashboard" : "onboarding",
          ...(includeFees ? { checkoutFees: feePayload(fees) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (isDashboard) {
        onSaved?.((data.classTypes as VendorClassType[]) ?? []);
        setSaved(true);
      } else {
        router.push("/onboard/step/3");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isDashboard && publicSlug && (
        <div className="flex justify-end">
          <CopyClassLink path={classesIndexPath(publicSlug)} label="Copy link to all classes" />
        </div>
      )}

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
                <span className="relative mt-0.5 inline-block shrink-0">
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    onChange={(e) =>
                      setTypes((prev) => ({
                        ...prev,
                        [ct.key]: { ...prev[ct.key], enabled: e.target.checked },
                      }))
                    }
                    className="sr-only"
                  />
                  <span
                    className={`block h-6 w-10 rounded-full transition-colors ${
                      state.enabled ? "bg-[#141413]" : "bg-zinc-300"
                    }`}
                  />
                  <span
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      state.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
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
                  <div className="relative w-40">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      $
                    </span>
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
                      className="input-field w-full"
                      style={{ paddingLeft: "1.75rem" }}
                    />
                  </div>
                </div>
              )}
              {isDashboard && publicSlug && (
                <div className="px-4 pb-4">
                  <CopyClassLink path={classPagePath(publicSlug, ct.key)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <OtherClassesEditor
        classes={customClasses}
        onChange={setCustomClasses}
        publicSlug={isDashboard ? publicSlug : null}
      />

      {includeFees && (
        <section className="space-y-3 border-t border-zinc-200 pt-6">
          <h2 className="text-base font-semibold text-zinc-900">Fees students also pay</h2>
          <CheckoutFeesEditor fees={fees} onChange={setFees} classOptions={feeClassOptions} />
        </section>
      )}

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
            onClick={() => router.push("/onboard/step/1")}
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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
