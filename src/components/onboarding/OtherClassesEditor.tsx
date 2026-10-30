"use client";

import {
  CUSTOM_DESCRIPTION_MAX,
  CUSTOM_NAME_MAX,
  MAX_CUSTOM_CLASSES,
  OTHER_CLASSES_HELPER,
  classPagePath,
  newCustomClassKey,
} from "@/lib/instructor-catalog";
import { CopyClassLink } from "./CopyClassLink";

export type CustomClassDraft = {
  class_type: string;
  name: string;
  description: string;
  price: string;
  active: boolean;
};

export function OtherClassesEditor({
  classes,
  onChange,
  publicSlug,
}: {
  classes: CustomClassDraft[];
  onChange: (next: CustomClassDraft[]) => void;
  publicSlug?: string | null;
}) {
  function update(index: number, patch: Partial<CustomClassDraft>) {
    onChange(classes.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= classes.length) return;
    const copy = classes.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    onChange(copy);
  }

  return (
    <section className="space-y-3 border-t border-zinc-200 pt-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Other classes</h2>
        <p className="mt-1 text-sm text-zinc-500">{OTHER_CLASSES_HELPER}</p>
      </div>

      {classes.map((row, index) => (
        <div key={row.class_type} className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={row.active}
                onChange={(e) => update(index, { active: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Active
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {publicSlug && (
                <CopyClassLink path={classPagePath(publicSlug, row.class_type)} />
              )}
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
                disabled={index === classes.length - 1}
                className="text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-40"
              >
                Move down
              </button>
              <button
                type="button"
                onClick={() => onChange(classes.filter((_, i) => i !== index))}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Class name</label>
              <input
                type="text"
                maxLength={CUSTOM_NAME_MAX}
                value={row.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Private lesson"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Price ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={row.price}
                onChange={(e) => update(index, { price: e.target.value })}
                placeholder="0.00"
                className="input-field w-full"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              Short description <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              maxLength={CUSTOM_DESCRIPTION_MAX}
              rows={2}
              value={row.description}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder="Shown to students on your class page"
              className="input-field w-full"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={classes.length >= MAX_CUSTOM_CLASSES}
        onClick={() =>
          onChange([
            ...classes,
            {
              class_type: newCustomClassKey(),
              name: "",
              description: "",
              price: "",
              active: true,
            },
          ])
        }
        className="text-sm font-medium text-[#C1440E] hover:underline disabled:opacity-40"
      >
        Add a class
      </button>
      {classes.length >= MAX_CUSTOM_CLASSES && (
        <p className="text-xs text-zinc-500">You can add up to {MAX_CUSTOM_CLASSES} other classes.</p>
      )}
    </section>
  );
}
