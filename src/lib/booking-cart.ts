/**
 * Multi-session cart helpers for checkout: Initial two-day package + add-ons.
 */
import {
  applicableFeeSnapshots,
  buildCheckoutAmounts,
  type CheckoutAmounts,
  type FeeRule,
  type PassThroughSnapshot,
} from "@/lib/instructor-catalog";

export type CartSessionLike = {
  id: string;
  classType: string;
  startsAt: Date;
  timezone?: string | null;
  priceCents: number;
  dayIndex?: number | null;
  enrolled: number;
  capacity: number;
  title?: string | null;
};

export function normalizeClassSessionIds(input: {
  classSessionId?: string | null;
  classSessionIds?: unknown;
}): string[] {
  const fromArray = Array.isArray(input.classSessionIds)
    ? input.classSessionIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];
  const single = input.classSessionId?.trim();
  const merged = [...fromArray];
  if (single && !merged.includes(single)) merged.unshift(single);
  return [...new Set(merged)];
}

export function localDateKey(date: Date, timezone?: string | null): string {
  const tz = timezone?.trim() || "America/Los_Angeles";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function sortSessionsByStart<T extends { startsAt: Date }>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function earliestSessionStart<T extends { startsAt: Date }>(sessions: T[]): Date | null {
  if (sessions.length === 0) return null;
  return sortSessionsByStart(sessions)[0]!.startsAt;
}

/** True when hours-before cancellation still applies vs the earliest meeting. */
export function isWithinCancellationWindow(
  earliestStartsAt: Date,
  hoursBefore: number | null | undefined,
  now = new Date()
): boolean {
  if (hoursBefore == null || !Number.isFinite(hoursBefore) || hoursBefore < 0) {
    return earliestStartsAt > now;
  }
  const deadlineMs = earliestStartsAt.getTime() - hoursBefore * 60 * 60 * 1000;
  return now.getTime() <= deadlineMs;
}

export type InitialPairValidation =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate a two-session Initial selection.
 * When the available Initial pool has both Day 1 and Day 2 labels, require one of each.
 */
export function validateInitialPair(
  selected: CartSessionLike[],
  availableInitial: CartSessionLike[]
): InitialPairValidation {
  if (selected.length !== 2) {
    return { ok: false, error: "Initial is 16 hours across two days — select both." };
  }
  if (selected.some((s) => s.classType !== "initial")) {
    return { ok: false, error: "Initial booking requires two Initial class days." };
  }
  const [a, b] = selected;
  const dayA = localDateKey(a.startsAt, a.timezone);
  const dayB = localDateKey(b.startsAt, b.timezone);
  if (dayA === dayB) {
    return {
      ok: false,
      error: "Pick Initial sessions on two different days.",
    };
  }

  const availableHasDay1 = availableInitial.some((s) => s.dayIndex === 1);
  const availableHasDay2 = availableInitial.some((s) => s.dayIndex === 2);
  if (availableHasDay1 && availableHasDay2) {
    const indexes = new Set(
      selected.map((s) => s.dayIndex).filter((n): n is number => n === 1 || n === 2)
    );
    if (!(indexes.has(1) && indexes.has(2))) {
      return {
        ok: false,
        error: "Select one Day 1 and one Day 2 for your Initial class.",
      };
    }
  }

  return { ok: true };
}

export type CartValidationResult =
  | { ok: true; sessions: CartSessionLike[]; primary: CartSessionLike }
  | { ok: false; error: string; status?: number };

/**
 * Validate a full checkout cart: capacity, future starts, and Initial two-day rules
 * for every Initial pair grouped from the cart.
 *
 * Cart shape: any number of non-initial sessions, plus Initial sessions in multiples
 * of two (each pair validated). Typical: exactly two Initial + optional add-ons.
 */
export function validateCheckoutCart(
  sessions: CartSessionLike[],
  allVendorInitialSessions: CartSessionLike[],
  now = new Date()
): CartValidationResult {
  if (sessions.length === 0) {
    return { ok: false, error: "Choose a class session.", status: 400 };
  }

  const byId = new Set(sessions.map((s) => s.id));
  if (byId.size !== sessions.length) {
    return { ok: false, error: "Duplicate class sessions in cart.", status: 400 };
  }

  for (const session of sessions) {
    if (session.enrolled >= session.capacity) {
      return { ok: false, error: "A selected class is full.", status: 409 };
    }
    if (session.startsAt <= now) {
      return { ok: false, error: "A selected class has already started.", status: 400 };
    }
  }

  const initialSessions = sessions.filter((s) => s.classType === "initial");
  if (initialSessions.length > 0) {
    if (initialSessions.length !== 2) {
      return {
        ok: false,
        error: "Initial is 16 hours across two days — select both.",
        status: 400,
      };
    }
    const pair = validateInitialPair(initialSessions, allVendorInitialSessions);
    if (!pair.ok) return { ok: false, error: pair.error, status: 400 };
  }

  const ordered = sortSessionsByStart(sessions);
  return { ok: true, sessions: ordered, primary: ordered[0]! };
}

export function computeCartTuitionCents(
  sessions: CartSessionLike[],
  catalogInitialPriceCents: number | null | undefined
): number {
  const initial = sessions.filter((s) => s.classType === "initial");
  const others = sessions.filter((s) => s.classType !== "initial");

  let tuition = others.reduce((sum, s) => sum + Math.max(0, s.priceCents), 0);

  if (initial.length === 2) {
    const catalog =
      catalogInitialPriceCents != null &&
      Number.isFinite(catalogInitialPriceCents) &&
      catalogInitialPriceCents > 0
        ? Math.round(catalogInitialPriceCents)
        : null;
    const fallback = Math.max(...initial.map((s) => Math.max(0, s.priceCents)), 0);
    tuition += catalog ?? fallback;
  } else if (initial.length === 1) {
    tuition += Math.max(0, initial[0]!.priceCents);
  }

  return tuition;
}

export function cartPassThroughFees(
  feeRules: FeeRule[],
  sessions: CartSessionLike[]
): PassThroughSnapshot[] {
  const keys = [...new Set(sessions.map((s) => s.classType))];
  const byId = new Map<string, PassThroughSnapshot>();
  for (const key of keys) {
    for (const fee of applicableFeeSnapshots(feeRules, key)) {
      if (!byId.has(fee.id)) byId.set(fee.id, fee);
    }
  }
  return [...byId.values()];
}

export function buildCartCheckoutAmounts(
  sessions: CartSessionLike[],
  feeRules: FeeRule[],
  catalogInitialPriceCents: number | null | undefined
): CheckoutAmounts {
  const tuition = computeCartTuitionCents(sessions, catalogInitialPriceCents);
  const passThrough = cartPassThroughFees(feeRules, sessions);
  return buildCheckoutAmounts(tuition, passThrough);
}

export function dayIndexLabel(dayIndex: number | null | undefined): string | null {
  if (dayIndex === 1) return "Day 1";
  if (dayIndex === 2) return "Day 2";
  return null;
}

export function sessionDisplayTitle(
  session: Pick<CartSessionLike, "title" | "classType" | "dayIndex">
): string {
  const day = dayIndexLabel(session.dayIndex);
  const base =
    session.title?.trim() ||
    (session.classType === "initial"
      ? "16hr Initial CCW"
      : session.classType === "renewal"
        ? "8hr Renewal"
        : session.classType === "add_a_gun"
          ? "Add a gun"
          : "Class");
  if (day && session.classType === "initial" && !base.toLowerCase().includes("day")) {
    return `${base} (${day})`;
  }
  return base;
}
