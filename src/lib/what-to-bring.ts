/**
 * Student packing list shown on an instructor's public "What To Bring" tab.
 * Null in the database means the instructor has not customized it yet.
 */

export const DEFAULT_WHAT_TO_BRING_ITEMS = [
  "Firearm (must be on your permit application)",
  "100 rounds of ammunition",
  "Eye protection (wrap-around)",
  "Ear protection (muffs or plugs)",
  "Holster",
  "Belt (sturdy, designed for carry)",
  "Spare magazine",
  "6 snap caps",
] as const;

const MAX_ITEMS = 40;
const MAX_ITEM_LENGTH = 120;

const defaultByKey = new Map(
  DEFAULT_WHAT_TO_BRING_ITEMS.map((item) => [item.toLowerCase(), item])
);

export function isDefaultWhatToBringItem(value: string): boolean {
  return defaultByKey.has(value.trim().toLowerCase());
}

export type NormalizedWhatToBring =
  | { ok: true; items: string[] }
  | { ok: false; error: string };

/** Trim, dedupe, and canonicalize known defaults. Drops blank entries. */
export function normalizeWhatToBring(raw: unknown): NormalizedWhatToBring {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Items must be a list." };
  }

  const items: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== "string") {
      return { ok: false, error: "Each item must be text." };
    }
    const text = entry.trim().replace(/\s+/g, " ");
    if (!text) continue;
    if (text.length > MAX_ITEM_LENGTH) {
      return { ok: false, error: "Each item must be 120 characters or fewer." };
    }
    const canonical = defaultByKey.get(text.toLowerCase()) ?? text;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(canonical);
    if (items.length > MAX_ITEMS) {
      return { ok: false, error: `You can list up to ${MAX_ITEMS} items.` };
    }
  }

  if (items.length === 0) {
    return { ok: false, error: "Select at least one item." };
  }

  return { ok: true, items };
}

/**
 * Items to render on the public profile.
 * A missing list keeps the shared defaults. A saved list replaces them.
 */
export function resolveWhatToBringItems(
  stored: string[] | null | undefined
): string[] {
  if (!stored) return [...DEFAULT_WHAT_TO_BRING_ITEMS];
  const normalized = normalizeWhatToBring(stored);
  return normalized.ok ? normalized.items : [...DEFAULT_WHAT_TO_BRING_ITEMS];
}
