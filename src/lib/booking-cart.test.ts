import { describe, expect, it } from "vitest";
import {
  buildCartCheckoutAmounts,
  computeCartTuitionCents,
  localDateKey,
  normalizeClassSessionIds,
  validateCheckoutCart,
  validateInitialPair,
  type CartSessionLike,
} from "@/lib/booking-cart";

function session(partial: Partial<CartSessionLike> & Pick<CartSessionLike, "id">): CartSessionLike {
  return {
    classType: "initial",
    startsAt: new Date("2026-06-01T16:00:00.000Z"),
    timezone: "America/Los_Angeles",
    priceCents: 27500,
    dayIndex: null,
    enrolled: 0,
    capacity: 12,
    title: null,
    ...partial,
  };
}

describe("normalizeClassSessionIds", () => {
  it("merges single id and array without duplicates", () => {
    expect(
      normalizeClassSessionIds({
        classSessionId: "a",
        classSessionIds: ["b", "a", "c"],
      })
    ).toEqual(["b", "a", "c"]);
  });
});

describe("validateInitialPair", () => {
  const day1 = session({
    id: "d1",
    startsAt: new Date("2026-06-01T16:00:00.000Z"),
    dayIndex: 1,
  });
  const day2 = session({
    id: "d2",
    startsAt: new Date("2026-06-02T16:00:00.000Z"),
    dayIndex: 2,
  });
  const sameDay = session({
    id: "d3",
    startsAt: new Date("2026-06-01T20:00:00.000Z"),
    dayIndex: 2,
  });

  it("requires two distinct local days", () => {
    expect(validateInitialPair([day1, sameDay], [day1, day2, sameDay]).ok).toBe(false);
    expect(validateInitialPair([day1, day2], [day1, day2]).ok).toBe(true);
  });

  it("requires Day 1 + Day 2 when both labels exist in the pool", () => {
    const unlabeled = session({
      id: "u1",
      startsAt: new Date("2026-06-03T16:00:00.000Z"),
      dayIndex: null,
    });
    expect(validateInitialPair([day1, unlabeled], [day1, day2, unlabeled]).ok).toBe(false);
    expect(validateInitialPair([day1, day2], [day1, day2, unlabeled]).ok).toBe(true);
  });

  it("allows any two days when labels are not both present", () => {
    const a = session({
      id: "a",
      startsAt: new Date("2026-06-01T16:00:00.000Z"),
      dayIndex: null,
    });
    const b = session({
      id: "b",
      startsAt: new Date("2026-06-08T16:00:00.000Z"),
      dayIndex: null,
    });
    expect(validateInitialPair([a, b], [a, b]).ok).toBe(true);
  });
});

describe("computeCartTuitionCents + amounts", () => {
  it("charges Initial package once, then add-on session price", () => {
    const initialA = session({
      id: "i1",
      priceCents: 27500,
      startsAt: new Date("2026-06-01T16:00:00.000Z"),
    });
    const initialB = session({
      id: "i2",
      priceCents: 27500,
      startsAt: new Date("2026-06-02T16:00:00.000Z"),
    });
    const renewal = session({
      id: "r1",
      classType: "renewal",
      priceCents: 9500,
      startsAt: new Date("2026-07-01T16:00:00.000Z"),
    });

    expect(computeCartTuitionCents([initialA, initialB], 30000)).toBe(30000);
    expect(computeCartTuitionCents([initialA, initialB, renewal], 30000)).toBe(39500);

    const amounts = buildCartCheckoutAmounts(
      [initialA, initialB, renewal],
      [
        {
          id: "fee1",
          name: "Range fee",
          amountCents: 2500,
          note: null,
          appliesToAll: true,
          classTypes: [],
          active: true,
          sortOrder: 0,
        },
      ],
      30000
    );
    expect(amounts.classTuitionCents).toBe(39500);
    expect(amounts.passThroughCents).toBe(2500);
    expect(amounts.platformFeeCents).toBe(Math.round(39500 * 0.06));
  });
});

describe("validateCheckoutCart", () => {
  it("rejects a single Initial session", () => {
    const only = session({ id: "i1" });
    const result = validateCheckoutCart([only], [only]);
    expect(result.ok).toBe(false);
  });

  it("accepts Initial pair + renewal and sorts by start", () => {
    const i2 = session({
      id: "i2",
      startsAt: new Date("2026-06-02T16:00:00.000Z"),
    });
    const i1 = session({
      id: "i1",
      startsAt: new Date("2026-06-01T16:00:00.000Z"),
    });
    const r = session({
      id: "r1",
      classType: "renewal",
      startsAt: new Date("2026-05-01T16:00:00.000Z"),
      priceCents: 9000,
    });
    const result = validateCheckoutCart([i2, i1, r], [i1, i2], new Date("2026-04-01"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.primary.id).toBe("r1");
      expect(result.sessions.map((s) => s.id)).toEqual(["r1", "i1", "i2"]);
    }
  });
});

describe("localDateKey", () => {
  it("formats a stable YYYY-MM-DD key", () => {
    expect(localDateKey(new Date("2026-06-15T16:00:00.000Z"), "UTC")).toBe("2026-06-15");
    expect(
      localDateKey(new Date("2026-06-01T16:00:00.000Z"), "America/Los_Angeles")
    ).not.toEqual(
      localDateKey(new Date("2026-06-02T16:00:00.000Z"), "America/Los_Angeles")
    );
  });
});
