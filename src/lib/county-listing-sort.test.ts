import { describe, expect, it } from "vitest";
import type { Vendor } from "@/types";
import { sortCountyListingVendors } from "@/lib/county-listing-sort";

function vendor(
  id: string,
  overrides: Partial<Vendor> & { name: string }
): Vendor {
  return {
    id,
    slug: id,
    name: overrides.name,
    city: "Testville",
    county: "test",
    countiesServed: ["test"],
    classTypes: ["both"],
    formats: ["in-person"],
    ...overrides,
  };
}

describe("sortCountyListingVendors", () => {
  const reviewStats = new Map([
    ["price-and-reviews", { averageRating: 4.5, count: 2 }],
  ]);

  it("puts pricing + reviews first, then pricing only, then the rest", () => {
    const sorted = sortCountyListingVendors(
      [
        vendor("no-price", { name: "Zebra No Price" }),
        vendor("price-only", {
          name: "Alpha Price Only",
          priceInitial: 100,
        }),
        vendor("price-and-reviews", {
          name: "Beta Price And Reviews",
          priceInitial: 120,
        }),
        vendor("reviews-no-price", { name: "Gamma Reviews Only" }),
      ],
      reviewStats,
      "featured"
    );

    expect(sorted.map((v) => v.id)).toEqual([
      "price-and-reviews",
      "price-only",
      "reviews-no-price",
      "no-price",
    ]);
  });

  it("delegates explicit sort options to applyListingSort", () => {
    const sorted = sortCountyListingVendors(
      [
        vendor("b", { name: "Bravo" }),
        vendor("a", { name: "Alpha" }),
      ],
      reviewStats,
      "name"
    );

    expect(sorted.map((v) => v.name)).toEqual(["Alpha", "Bravo"]);
  });
});
