"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import {
  DEFAULT_WHAT_TO_BRING_ITEMS,
  isDefaultWhatToBringItem,
  normalizeWhatToBring,
  type NormalizedWhatToBring,
} from "@/lib/what-to-bring";

export interface WhatToBringFieldsHandle {
  /** Includes a typed item that has not been added yet. */
  collect: () => NormalizedWhatToBring;
}

interface Props {
  /** Null until the instructor saves a custom list. */
  items: string[] | null;
}

function splitItems(stored: string[] | null): {
  selected: string[];
  custom: string[];
} {
  if (!stored) {
    return { selected: [...DEFAULT_WHAT_TO_BRING_ITEMS], custom: [] };
  }
  const selected: string[] = [];
  const custom: string[] = [];
  for (const item of stored) {
    if (isDefaultWhatToBringItem(item)) {
      const canonical = DEFAULT_WHAT_TO_BRING_ITEMS.find(
        (entry) => entry.toLowerCase() === item.trim().toLowerCase()
      );
      if (canonical && !selected.includes(canonical)) selected.push(canonical);
    } else if (item.trim()) {
      custom.push(item.trim().replace(/\s+/g, " "));
    }
  }
  return { selected, custom };
}

export const WhatToBringFields = forwardRef<WhatToBringFieldsHandle, Props>(
  function WhatToBringFields({ items }, ref) {
    const initial = useMemo(() => splitItems(items), [items]);
    const [selected, setSelected] = useState<string[]>(initial.selected);
    const [custom, setCustom] = useState<string[]>(initial.custom);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState("");

    const allSelected = DEFAULT_WHAT_TO_BRING_ITEMS.every((item) => selected.includes(item));

    useImperativeHandle(
      ref,
      () => ({
        collect: () => {
          const pending = [...custom];
          const typed = draft.trim().replace(/\s+/g, " ");
          let nextSelected = selected;
          if (typed) {
            if (isDefaultWhatToBringItem(typed)) {
              const canonical = DEFAULT_WHAT_TO_BRING_ITEMS.find(
                (entry) => entry.toLowerCase() === typed.toLowerCase()
              );
              if (canonical && !nextSelected.includes(canonical)) {
                nextSelected = [...nextSelected, canonical];
              }
            } else if (!pending.some((item) => item.toLowerCase() === typed.toLowerCase())) {
              pending.push(typed);
            }
          }
          const orderedDefaults = DEFAULT_WHAT_TO_BRING_ITEMS.filter((item) =>
            nextSelected.includes(item)
          );
          return normalizeWhatToBring([...orderedDefaults, ...pending]);
        },
      }),
      [custom, draft, selected]
    );

    function toggleDefault(item: string) {
      setError("");
      setSelected((current) =>
        current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
      );
    }

    function addCustom(raw: string): boolean {
      const text = raw.trim().replace(/\s+/g, " ");
      if (!text) return false;
      const key = text.toLowerCase();
      if (isDefaultWhatToBringItem(text)) {
        const canonical = DEFAULT_WHAT_TO_BRING_ITEMS.find(
          (entry) => entry.toLowerCase() === key
        );
        if (canonical && !selected.includes(canonical)) {
          setSelected((current) => [...current, canonical]);
        }
        return true;
      }
      const duplicate =
        selected.some((item) => item.toLowerCase() === key) ||
        custom.some((item) => item.toLowerCase() === key);
      if (duplicate) {
        setError("That item is already on the list.");
        return false;
      }
      setCustom((current) => [...current, text]);
      return true;
    }

    return (
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="sr-only">Default items</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-zinc-900 bg-zinc-50 px-4 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                setError("");
                setSelected(allSelected ? [] : [...DEFAULT_WHAT_TO_BRING_ITEMS]);
              }}
              className="h-4 w-4 border-zinc-300 text-zinc-900"
            />
            <span className="font-medium text-zinc-800">Select all</span>
          </label>
          {DEFAULT_WHAT_TO_BRING_ITEMS.map((item) => {
            const checked = selected.includes(item);
            return (
              <label
                key={item}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                  checked
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDefault(item)}
                  className="mt-0.5 h-4 w-4 border-zinc-300 text-zinc-900"
                />
                <span className="text-sm font-medium text-zinc-800">{item}</span>
              </label>
            );
          })}
        </fieldset>

        <div>
          <p className="text-sm font-medium text-zinc-800">Add another item</p>
          <p className="mt-1 text-sm text-zinc-500">
            Type anything else students should bring. It shows up on your live profile with the items you selected.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setError("");
                  if (addCustom(draft)) setDraft("");
                }
              }}
              maxLength={120}
              className="input-field min-w-0 flex-1"
              placeholder="e.g. Closed-toe shoes"
              aria-label="Additional item"
            />
            <button
              type="button"
              onClick={() => {
                setError("");
                if (addCustom(draft)) setDraft("");
              }}
              className="btn-secondary w-button shrink-0"
            >
              Add
            </button>
          </div>
          {custom.length > 0 && (
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {custom.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-zinc-800">{item}</span>
                  <button
                    type="button"
                    onClick={() => setCustom((current) => current.filter((entry) => entry !== item))}
                    className="text-xs font-medium text-zinc-500 underline hover:text-zinc-800"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);
