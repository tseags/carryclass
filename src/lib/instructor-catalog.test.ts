import { describe, expect, it } from "vitest";
import { calculatePlatformServiceFeeCents } from "@/lib/booking-constants";
import {
  applicableFeeSnapshots,
  buildCheckoutAmounts,
  buildCheckoutLines,
  cardsFromClassRows,
  isCanonicalClassType,
  isCustomClassKey,
  newCustomClassKey,
  normalizeClassTypeDrafts,
  normalizeFeeDrafts,
  PLATFORM_FEE_LINE_LABEL,
} from "@/lib/instructor-catalog";

describe("checkout fee stack", () => {
  it("charges 6% of class price only and pays pass-through fees to the instructor", () => {
    const amounts = buildCheckoutAmounts(20000, [
      { id: "fee-1", name: "Range fee", amountCents: 2500 },
    ]);
    expect(amounts.platformFeeCents).toBe(1200);
    expect(amounts.platformFeeCents).toBe(calculatePlatformServiceFeeCents(20000));
    expect(amounts.passThroughCents).toBe(2500);
    expect(amounts.totalCents).toBe(23700);
    expect(amounts.classTuitionCents + amounts.passThroughCents).toBe(22500);
  });

  it("keeps the 6% line when there are no pass-through fees", () => {
    const amounts = buildCheckoutAmounts(20000, []);
    const lines = buildCheckoutLines({
      tuitionName: "Class",
      tuitionDescription: null,
      feeNotes: [],
      amounts,
    });
    expect(amounts.platformFeeCents).toBe(1200);
    expect(amounts.totalCents).toBe(21200);
    expect(lines.map((line) => line.name)).toEqual(["Class", PLATFORM_FEE_LINE_LABEL]);
    expect(lines.at(-1)?.unitAmountCents).toBe(1200);
  });

  it("does not change the 6% when a pass-through fee is added or removed", () => {
    const withFee = buildCheckoutAmounts(15000, [
      { id: "fee-1", name: "Ammo", amountCents: 4000 },
    ]);
    const withoutFee = buildCheckoutAmounts(15000, []);
    expect(withFee.platformFeeCents).toBe(withoutFee.platformFeeCents);
    expect(withFee.platformFeeCents).toBe(calculatePlatformServiceFeeCents(15000));
  });

  it("layers each applicable fee under the class price and above the 6% line", () => {
    const rules = [
      {
        id: "range",
        name: "Range fee",
        amountCents: 2500,
        note: "Per student",
        appliesToAll: false,
        classTypes: ["initial"],
        active: true,
        sortOrder: 0,
      },
      {
        id: "ammo",
        name: "Ammo",
        amountCents: 1000,
        note: null,
        appliesToAll: true,
        active: true,
        classTypes: [],
        sortOrder: 1,
      },
      {
        id: "off",
        name: "Targets",
        amountCents: 500,
        note: null,
        appliesToAll: true,
        active: false,
        classTypes: [],
        sortOrder: 2,
      },
    ];
    const amounts = buildCheckoutAmounts(20000, applicableFeeSnapshots(rules, "initial"));
    const lines = buildCheckoutLines({
      tuitionName: "CCW Initial",
      tuitionDescription: null,
      feeNotes: rules.map((rule) => ({ id: rule.id, note: rule.note })),
      amounts,
    });
    expect(lines.map((line) => line.name)).toEqual([
      "CCW Initial",
      "Range fee",
      "Ammo",
      PLATFORM_FEE_LINE_LABEL,
    ]);
    expect(applicableFeeSnapshots(rules, "renewal").map((fee) => fee.name)).toEqual(["Ammo"]);
  });
});

describe("class catalog", () => {
  it("lists CCW classes first and other classes in saved order", () => {
    const cards = cardsFromClassRows([
      {
        class_type: "custom_abcd1234",
        display_name: "Private lesson",
        description: "One student.",
        price: 180,
        is_active: true,
        sort_order: 1,
      },
      {
        class_type: "custom_abcd1235",
        display_name: "Women's handgun intro",
        description: "",
        price: 90,
        is_active: true,
        sort_order: 0,
      },
      { class_type: "renewal", price: 100, is_active: true },
      { class_type: "initial", price: 200, is_active: false },
      { class_type: "add_a_gun", price: 40, is_active: true },
      {
        class_type: "custom_abcd1236",
        display_name: "Hidden",
        price: 50,
        is_active: false,
        sort_order: 0,
      },
    ]);
    expect(cards.ccw.map((card) => card.key)).toEqual(["renewal", "add_a_gun"]);
    expect(cards.other.map((card) => card.title)).toEqual([
      "Women's handgun intro",
      "Private lesson",
    ]);
  });

  it("requires one active CCW type and keeps custom keys stable", () => {
    const key = newCustomClassKey();
    expect(isCustomClassKey(key)).toBe(true);
    expect(isCanonicalClassType(key)).toBe(false);
    const saved = normalizeClassTypeDrafts([
      { class_type: "initial", price: 200, is_active: true },
      {
        class_type: key,
        display_name: "  Private lesson  ",
        description: "Bring your own firearm",
        price: "180.00",
        is_active: true,
      },
    ]);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.types[1]?.class_type).toBe(key);
    expect(saved.types[1]?.display_name).toBe("Private lesson");

    const renamed = normalizeClassTypeDrafts([
      { class_type: "initial", price: 200, is_active: true },
      {
        class_type: key,
        display_name: "Private coaching",
        price: 180,
        is_active: true,
      },
    ]);
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.types[1]?.class_type).toBe(key);
  });

  it("rejects a fee that tries to replace the 6% and a class without a CCW type", () => {
    const noCcw = normalizeClassTypeDrafts([
      {
        class_type: newCustomClassKey(),
        display_name: "Private lesson",
        price: 100,
        is_active: true,
      },
    ]);
    expect(noCcw.ok).toBe(false);

    const fees = normalizeFeeDrafts(
      [{ name: "Range fee", amount: 25, applies_to_all: true, is_active: true, class_types: [] }],
      new Set(["initial"])
    );
    expect(fees.ok).toBe(true);
    if (!fees.ok) return;
    expect(fees.fees[0]?.amount).toBe(25);
    expect(fees.fees[0]?.applies_to_all).toBe(true);
  });
});
