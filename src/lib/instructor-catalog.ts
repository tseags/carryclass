/**
 * Instructor-defined classes and pass-through checkout fees.
 * The CarryClass transaction fee stays 6% of class tuition on every class.
 */
import { calculatePlatformServiceFeeCents } from "@/lib/booking-constants";

export const MAX_CUSTOM_CLASSES = 12;
export const MAX_CHECKOUT_FEES = 8;
export const CUSTOM_NAME_MAX = 80;
export const CUSTOM_DESCRIPTION_MAX = 200;
export const FEE_NAME_MAX = 60;
export const FEE_NOTE_MAX = 140;

export const CANONICAL_CLASS_TYPES = ["initial", "renewal", "add_a_gun"] as const;
export type CanonicalClassType = (typeof CANONICAL_CLASS_TYPES)[number];

export const OTHER_CLASSES_HELPER =
  "Classes besides CCW. Students can book these from your CarryClass page. The 6% CarryClass transaction fee applies to these classes too.";

export const CHECKOUT_FEES_HELPER =
  "Fees you already charge, such as range, ammo, or targets. These are added on top of your class price. Students pay them at checkout and you keep the full amount. Every class also has the 6% CarryClass transaction fee on the class price. That fee is separate and is not taken out of these.";

export const PLATFORM_FEE_LINE_LABEL = "CarryClass transaction fee (6%, non-refundable)";

export const OTHER_CLASSES_HEADING = "Other classes";
export const OTHER_CLASSES_NOTE =
  "Other training this instructor offers. These are not CCW classes.";

export const CCW_PUBLIC_COPY: Record<CanonicalClassType, { title: string; subtitle: string }> = {
  initial: {
    title: "16-Hour Initial CCW Class",
    subtitle:
      "For first-time CCW applicants. Covers safety, laws, handling, and live-fire qualification.",
  },
  renewal: {
    title: "8-Hour Renewal CCW Class",
    subtitle:
      "For existing permit holders. State-required refresher with live-fire qualification.",
  },
  add_a_gun: {
    title: "Add a Gun to Permit",
    subtitle: "Add additional firearms to your existing CCW permit.",
  },
};

const CUSTOM_KEY = /^custom_[a-z0-9]{8}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalClassType(key: string): key is CanonicalClassType {
  return (CANONICAL_CLASS_TYPES as readonly string[]).includes(key);
}

export function isCustomClassKey(key: string): boolean {
  return CUSTOM_KEY.test(key);
}

export function newCustomClassKey(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `custom_${hex}`;
}

export function classesIndexPath(slug: string): string {
  return `/instructors/${slug}/classes`;
}

export function classPagePath(slug: string, classKey: string): string {
  return `/instructors/${slug}/classes/${encodeURIComponent(classKey)}`;
}

export function bookClassPath(slug: string, classKey: string): string {
  return `/instructors/${slug}/book?class=${encodeURIComponent(classKey)}`;
}

export function formatCatalogPrice(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const n = Math.round(amount * 100) / 100;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function formatCents(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

export type PassThroughSnapshot = {
  id: string;
  name: string;
  amountCents: number;
};

export type CheckoutAmounts = {
  classTuitionCents: number;
  passThrough: PassThroughSnapshot[];
  passThroughCents: number;
  platformFeeCents: number;
  totalCents: number;
};

/** Tuition, then each pass-through fee, then 6% of tuition only. */
export function buildCheckoutAmounts(
  classTuitionCents: number,
  passThrough: PassThroughSnapshot[]
): CheckoutAmounts {
  const tuition =
    Number.isFinite(classTuitionCents) && classTuitionCents > 0
      ? Math.round(classTuitionCents)
      : 0;
  const lines = passThrough
    .filter((fee) => fee.amountCents > 0 && fee.name.trim())
    .map((fee) => ({
      id: fee.id,
      name: fee.name.trim(),
      amountCents: Math.round(fee.amountCents),
    }));
  const passThroughCents = lines.reduce((sum, fee) => sum + fee.amountCents, 0);
  const platformFeeCents = calculatePlatformServiceFeeCents(tuition);
  return {
    classTuitionCents: tuition,
    passThrough: lines,
    passThroughCents,
    platformFeeCents,
    totalCents: tuition + passThroughCents + platformFeeCents,
  };
}

export type FeeRule = {
  id: string;
  name: string;
  amountCents: number;
  note: string | null;
  appliesToAll: boolean;
  classTypes: string[];
  active: boolean;
  sortOrder: number;
};

export function applicableFeeSnapshots(
  rules: FeeRule[],
  classKey: string
): PassThroughSnapshot[] {
  return rules
    .filter((rule) => rule.active && rule.amountCents > 0)
    .filter((rule) => rule.appliesToAll || rule.classTypes.includes(classKey))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
      amountCents: rule.amountCents,
    }));
}

export type CheckoutLine = {
  name: string;
  description: string | null;
  unitAmountCents: number;
};

/** Stripe line items in checkout order. The last line is always the 6% fee. */
export function buildCheckoutLines(input: {
  tuitionName: string;
  tuitionDescription: string | null;
  feeNotes: Array<{ id: string; note: string | null }>;
  amounts: CheckoutAmounts;
}): CheckoutLine[] {
  const lines: CheckoutLine[] = [
    {
      name: input.tuitionName,
      description: input.tuitionDescription,
      unitAmountCents: input.amounts.classTuitionCents,
    },
  ];
  for (const fee of input.amounts.passThrough) {
    lines.push({
      name: fee.name,
      description: input.feeNotes.find((note) => note.id === fee.id)?.note ?? null,
      unitAmountCents: fee.amountCents,
    });
  }
  lines.push({
    name: PLATFORM_FEE_LINE_LABEL,
    description: null,
    unitAmountCents: input.amounts.platformFeeCents,
  });
  return lines;
}

export type PublicClassCard = {
  key: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  priceCents: number | null;
};

type ClassRow = {
  class_type: string;
  display_name?: string | null;
  description?: string | null;
  price: number | string;
  is_active: boolean;
  sort_order?: number | null;
};

export function cardsFromClassRows(rows: ClassRow[]): {
  ccw: PublicClassCard[];
  other: PublicClassCard[];
} {
  const active = rows.filter((row) => row.is_active);
  const ccw: PublicClassCard[] = [];
  for (const key of CANONICAL_CLASS_TYPES) {
    const row = active.find((item) => item.class_type === key);
    if (!row) continue;
    const price = Number(row.price);
    const copy = CCW_PUBLIC_COPY[key];
    ccw.push({
      key,
      title: copy.title,
      subtitle: copy.subtitle,
      priceLabel: Number.isFinite(price) ? formatCatalogPrice(price) : "—",
      priceCents: Number.isFinite(price) ? Math.round(price * 100) : null,
    });
  }
  const other = active
    .filter((row) => isCustomClassKey(row.class_type))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((row) => {
      const price = Number(row.price);
      return {
        key: row.class_type,
        title: row.display_name?.trim() || "Class",
        subtitle: row.description?.trim() || "",
        priceLabel: Number.isFinite(price) ? formatCatalogPrice(price) : "—",
        priceCents: Number.isFinite(price) ? Math.round(price * 100) : null,
      };
    });
  return { ccw, other };
}

export function directoryCcwCards(vendor: {
  priceInitial?: number | null;
  priceRenewal?: number | null;
  priceAddGun?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  classTypes?: string[];
}): PublicClassCard[] {
  const classTypes = vendor.classTypes ?? [];
  const cards: PublicClassCard[] = [];
  if (
    vendor.priceInitial ||
    classTypes.includes("initial") ||
    classTypes.includes("both")
  ) {
    const value = vendor.priceInitial ?? vendor.priceMax ?? vendor.priceMin;
    cards.push({
      key: "initial",
      title: CCW_PUBLIC_COPY.initial.title,
      subtitle: CCW_PUBLIC_COPY.initial.subtitle,
      priceLabel: value != null ? formatCatalogPrice(value) : "—",
      priceCents: value != null ? Math.round(value * 100) : null,
    });
  }
  if (
    vendor.priceRenewal ||
    classTypes.includes("renewal") ||
    classTypes.includes("both")
  ) {
    const value = vendor.priceRenewal ?? vendor.priceMin ?? vendor.priceMax;
    cards.push({
      key: "renewal",
      title: CCW_PUBLIC_COPY.renewal.title,
      subtitle: CCW_PUBLIC_COPY.renewal.subtitle,
      priceLabel: value != null ? formatCatalogPrice(value) : "—",
      priceCents: value != null ? Math.round(value * 100) : null,
    });
  }
  if (vendor.priceAddGun) {
    cards.push({
      key: "add_a_gun",
      title: CCW_PUBLIC_COPY.add_a_gun.title,
      subtitle: CCW_PUBLIC_COPY.add_a_gun.subtitle,
      priceLabel: formatCatalogPrice(vendor.priceAddGun),
      priceCents: Math.round(vendor.priceAddGun * 100),
    });
  }
  return cards;
}

export function bookChoiceLabel(card: PublicClassCard): string {
  if (card.key === "initial") return "Initial";
  if (card.key === "renewal") return "Renewal";
  if (card.key === "add_a_gun") return "Add a gun";
  return card.title;
}

export type NormalizedClassType = {
  class_type: string;
  display_name: string | null;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
};

function roundDollars(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeClassTypeDrafts(
  raw: unknown
): { ok: true; types: NormalizedClassType[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "At least one class type is required." };
  }
  const types: NormalizedClassType[] = [];
  const seen = new Set<string>();
  let customCount = 0;
  let customOrder = 0;
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) return { ok: false, error: "Invalid class type." };
    const key = typeof row.class_type === "string" ? row.class_type.trim() : "";
    if (!key || seen.has(key)) {
      return { ok: false, error: "Each class needs its own type." };
    }
    seen.add(key);
    const active = Boolean(row.is_active);
    const price = roundDollars(row.price) ?? 0;
    if (isCanonicalClassType(key)) {
      if (active && price <= 0) {
        const label =
          key === "initial" ? "CCW Initial" : key === "renewal" ? "CCW Renewal" : "Add-A-Gun";
        return { ok: false, error: `Enter a price greater than $0 for ${label}.` };
      }
      types.push({
        class_type: key,
        display_name: null,
        description: null,
        price: price > 0 ? price : 0,
        is_active: active,
        sort_order: CANONICAL_CLASS_TYPES.indexOf(key),
      });
      continue;
    }
    if (!isCustomClassKey(key)) {
      return { ok: false, error: "Class type is not recognized." };
    }
    customCount += 1;
    if (customCount > MAX_CUSTOM_CLASSES) {
      return { ok: false, error: `You can add up to ${MAX_CUSTOM_CLASSES} other classes.` };
    }
    const name = typeof row.display_name === "string" ? row.display_name.trim() : "";
    if (!name) return { ok: false, error: "Each other class needs a name." };
    if (name.length > CUSTOM_NAME_MAX) {
      return { ok: false, error: `Class names can be up to ${CUSTOM_NAME_MAX} characters.` };
    }
    const description = typeof row.description === "string" ? row.description.trim() : "";
    if (description.length > CUSTOM_DESCRIPTION_MAX) {
      return {
        ok: false,
        error: `Class descriptions can be up to ${CUSTOM_DESCRIPTION_MAX} characters.`,
      };
    }
    if (price <= 0) {
      return { ok: false, error: `Enter a price greater than $0 for ${name}.` };
    }
    types.push({
      class_type: key,
      display_name: name,
      description: description || null,
      price,
      is_active: active,
      sort_order: customOrder,
    });
    customOrder += 1;
  }
  if (!types.some((type) => isCanonicalClassType(type.class_type) && type.is_active)) {
    return { ok: false, error: "Select at least one CCW class type." };
  }
  return { ok: true, types };
}

export type NormalizedFee = {
  id: string | null;
  name: string;
  amount: number;
  note: string | null;
  applies_to_all: boolean;
  class_types: string[];
  is_active: boolean;
  sort_order: number;
};

export function normalizeFeeDrafts(
  raw: unknown,
  allowedClassKeys: ReadonlySet<string>
): { ok: true; fees: NormalizedFee[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "Invalid fees." };
  if (raw.length > MAX_CHECKOUT_FEES) {
    return { ok: false, error: `You can add up to ${MAX_CHECKOUT_FEES} checkout fees.` };
  }
  const fees: NormalizedFee[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const row = asRecord(raw[index]);
    if (!row) return { ok: false, error: "Invalid fee." };
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) return { ok: false, error: "Each fee needs a name." };
    if (name.length > FEE_NAME_MAX) {
      return { ok: false, error: `Fee names can be up to ${FEE_NAME_MAX} characters.` };
    }
    const amount = roundDollars(row.amount);
    if (amount == null || amount <= 0) {
      return { ok: false, error: `Enter an amount greater than $0 for ${name}.` };
    }
    const note = typeof row.note === "string" ? row.note.trim() : "";
    if (note.length > FEE_NOTE_MAX) {
      return { ok: false, error: `Fee notes can be up to ${FEE_NOTE_MAX} characters.` };
    }
    const appliesToAll = Boolean(row.applies_to_all);
    const requested = Array.isArray(row.class_types)
      ? row.class_types.filter((key): key is string => typeof key === "string")
      : [];
    const classTypes = appliesToAll
      ? []
      : requested.filter((key) => allowedClassKeys.has(key));
    if (!appliesToAll && classTypes.length === 0) {
      return { ok: false, error: `Choose at least one class for ${name}.` };
    }
    const id = typeof row.id === "string" && UUID_RE.test(row.id) ? row.id : null;
    fees.push({
      id,
      name,
      amount,
      note: note || null,
      applies_to_all: appliesToAll,
      class_types: classTypes,
      is_active: Boolean(row.is_active),
      sort_order: index,
    });
  }
  return { ok: true, fees };
}

export function feeRuleFromRow(row: {
  id: string;
  name: string;
  amount: number | string;
  note?: string | null;
  applies_to_all: boolean;
  class_types?: string[] | null;
  is_active: boolean;
  sort_order?: number | null;
}): FeeRule {
  const dollars = Number(row.amount);
  return {
    id: row.id,
    name: row.name,
    amountCents: Number.isFinite(dollars) ? Math.round(dollars * 100) : 0,
    note: row.note?.trim() || null,
    appliesToAll: row.applies_to_all,
    classTypes: row.class_types ?? [],
    active: row.is_active,
    sortOrder: row.sort_order ?? 0,
  };
}

export function parsePassThroughSnapshot(raw: unknown): PassThroughSnapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: PassThroughSnapshot[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const id = typeof row.id === "string" ? row.id : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const amountCents = Number(row.amountCents);
    if (!id || !name || !Number.isFinite(amountCents) || amountCents <= 0) continue;
    out.push({ id, name, amountCents: Math.round(amountCents) });
  }
  return out;
}
