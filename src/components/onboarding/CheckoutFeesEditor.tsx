"use client";

import { useState } from "react";
import type { VendorCheckoutFee } from "@/lib/onboarding-db";
import {
  CHECKOUT_FEES_HELPER,
  FEE_NAME_MAX,
  FEE_NOTE_MAX,
  MAX_CHECKOUT_FEES,
} from "@/lib/instructor-catalog";

export type FeeDraft = {
  id: string;
  name: string;
  amount: string;
  note: string;
  appliesToAll: boolean;
  classTypes: string[];
  active: boolean;
};

export function feeDraftsFromRows(rows: VendorCheckoutFee[]): FeeDraft[] {
  return rows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      name: row.name,
      amount: String(Number(row.amount)),
      note: row.note ?? "",
      appliesToAll: row.applies_to_all,
      classTypes: row.class_types ?? [],
      active: row.is_active,
    }));
}

export function feePayload(fees: FeeDraft[]) {
  return fees.map((fee) => ({
    id: fee.id,
    name: fee.name,
    amount: fee.amount === "" ? 0 : Number(fee.amount),
    note: fee.note,
    applies_to_all: fee.appliesToAll,
    class_types: fee.classTypes,
    is_active: fee.active,
  }));
}

function newFeeId() {
  return `new_${Math.random().toString(36).slice(2, 10)}`;
}

export function CheckoutFeesEditor({
  fees,
  onChange,
  classOptions,
}: {
  fees: FeeDraft[];
  onChange: (next: FeeDraft[]) => void;
  classOptions: { key: string; label: string }[];
}) {
  function update(index: number, patch: Partial<FeeDraft>) {
    onChange(fees.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= fees.length) return;
    const copy = fees.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    onChange(copy);
  }

  function toggleClass(index: number, key: string) {
    const current = fees[index]?.classTypes ?? [];
    const classTypes = current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key];
    update(index, { classTypes });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">{CHECKOUT_FEES_HELPER}</p>
      {fees.map((fee, index) => (
        <div key={fee.id} className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={fee.active}
                onChange={(e) => update(index, { active: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Active
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-40"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === fees.length - 1}
                className="text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-40"
              >
                Move down
              </button>
              <button
                type="button"
                onClick={() => onChange(fees.filter((_, i) => i !== index))}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Fee name</label>
              <input
                type="text"
                maxLength={FEE_NAME_MAX}
                value={fee.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Range fee"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={fee.amount}
                onChange={(e) => update(index, { amount: e.target.value })}
                placeholder="0.00"
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Note for students <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={FEE_NOTE_MAX}
              value={fee.note}
              onChange={(e) => update(index, { note: e.target.value })}
              placeholder="Charged per student"
              className="input-field w-full"
            />
          </div>
          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-zinc-700">Applies to</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name={`fee-scope-${fee.id}`}
                  checked={fee.appliesToAll}
                  onChange={() => update(index, { appliesToAll: true })}
                />
                Every class
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name={`fee-scope-${fee.id}`}
                  checked={!fee.appliesToAll}
                  onChange={() => update(index, { appliesToAll: false })}
                />
                Selected classes
              </label>
            </div>
            {!fee.appliesToAll && (
              <div className="mt-2 space-y-1.5 pl-6">
                {classOptions.map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={fee.classTypes.includes(option.key)}
                      onChange={() => toggleClass(index, option.key)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </div>
      ))}
      <button
        type="button"
        disabled={fees.length >= MAX_CHECKOUT_FEES}
        onClick={() =>
          onChange([
            ...fees,
            {
              id: newFeeId(),
              name: "",
              amount: "",
              note: "",
              appliesToAll: true,
              classTypes: [],
              active: true,
            },
          ])
        }
        className="text-sm font-medium text-[#C1440E] hover:underline disabled:opacity-40"
      >
        Add a fee
      </button>
      {fees.length >= MAX_CHECKOUT_FEES && (
        <p className="text-xs text-zinc-500">You can add up to {MAX_CHECKOUT_FEES} fees.</p>
      )}
    </div>
  );
}

export function CheckoutFeesForm({
  initialFees,
  classOptions,
  onSaved,
}: {
  initialFees: VendorCheckoutFee[];
  classOptions: { key: string; label: string }[];
  onSaved?: (fees: VendorCheckoutFee[]) => void;
}) {
  const [fees, setFees] = useState<FeeDraft[]>(() => feeDraftsFromRows(initialFees));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/checkout-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutFees: feePayload(fees) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      const next = (data.fees as VendorCheckoutFee[]) ?? [];
      setFees(feeDraftsFromRows(next));
      onSaved?.(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CheckoutFeesEditor fees={fees} onChange={setFees} classOptions={classOptions} />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && !saving && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-button inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
