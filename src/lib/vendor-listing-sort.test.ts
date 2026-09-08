import { describe, expect, it } from "vitest";
import type { Vendor } from "@/types";
import { applyListingSort } from "@/lib/vendor-listing-sort";

function vendor(
  id: string,
  overrides: Partial<Vendor> & { name: string }
): Vendor {
  return {
    id,
    slug: id,
    name: overrides.name,
    type: "company",
    city: "Testville",
    county: "test",
    state: "CA",
    countiesServed: ["test"],
    classTypes: ["both"],
    formats: ["in-person"],
    createdAt: "2024-01-01",
    ...overrides,
  };
}

describe("applyListingSort price", () => {
  it("sorts low to high by 16-hr initial only", () => {
    const sorted = applyListingSort(
      [
        vendor("jarvis", {
          name: "Jarvis Firearms Training",
          priceInitial: 300,
          priceRenewal: 150,
        }),
        vendor("psi", {
          name: "Public Safety Institute",
          priceInitial: 275,
          priceRenewal: 150,
        }),
        vendor("paragraph", {
          name: "Paragraph 2, LLC",
          priceInitial: 275,
          priceRenewal: 175,
        }),
        vendor("ccwpi", {
          name: "CCW Permit Instruction",
          priceInitial: 295,
          priceRenewal: 195,
        }),
      ],
      "price-low"
    );

    expect(sorted.map((v) => v.id)).toEqual([
      "paragraph",
      "psi",
      "ccwpi",
      "jarvis",
    ]);
  });

  it("sorts high to low by 16-hr initial only", () => {
    const sorted = applyListingSort(
      [
        vendor("cheap", {
          name: "Cheap",
          priceInitial: 200,
          priceRenewal: 100,
        }),
        vendor("expensive", {
          name: "Expensive",
          priceInitial: 400,
          priceRenewal: 50,
        }),
      ],
      "price-high"
    );

    expect(sorted.map((v) => v.id)).toEqual(["expensive", "cheap"]);
  });

  it("places renewal-only after all 16-hr, sorted by renewal, before no pricing", () => {
    const sorted = applyListingSort(
      [
        vendor("no-price", { name: "No Price" }),
        vendor("renewal-only-high", {
          name: "Renewal High",
          priceRenewal: 200,
        }),
        vendor("both-expensive", {
          name: "Both Expensive",
          priceInitial: 400,
          priceRenewal: 50,
        }),
        vendor("renewal-only-low", {
          name: "Renewal Low",
          priceRenewal: 100,
        }),
        vendor("both-cheap", {
          name: "Both Cheap",
          priceInitial: 150,
          priceRenewal: 90,
        }),
      ],
      "price-low"
    );

    expect(sorted.map((v) => v.id)).toEqual([
      "both-cheap",
      "both-expensive",
      "renewal-only-low",
      "renewal-only-high",
      "no-price",
    ]);
  });

  it("sorts renewal-only high to low after all 16-hr", () => {
    const sorted = applyListingSort(
      [
        vendor("renewal-only-low", {
          name: "Renewal Low",
          priceRenewal: 100,
        }),
        vendor("with-initial", {
          name: "With Initial",
          priceInitial: 50,
        }),
        vendor("renewal-only-high", {
          name: "Renewal High",
          priceRenewal: 200,
        }),
      ],
      "price-high"
    );

    expect(sorted.map((v) => v.id)).toEqual([
      "with-initial",
      "renewal-only-high",
      "renewal-only-low",
    ]);
  });
});
