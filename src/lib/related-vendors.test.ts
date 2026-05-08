import { describe, expect, it } from "vitest";
import type { Vendor } from "@/types";
import { getRelatedVendorsForVendorProfile, vendorHasListingPricesShown } from "./related-vendors";

function minimalVendor(partial: Partial<Vendor> & Pick<Vendor, "slug" | "name" | "city" | "county">): Vendor {
  return {
    id: partial.slug,
    slug: partial.slug,
    name: partial.name,
    type: "instructor",
    city: partial.city,
    county: partial.county,
    state: "CA",
    countiesServed: partial.countiesServed ?? [partial.county],
    classTypes: ["both"],
    formats: ["in-person"],
    createdAt: "2020-01-01",
    ...partial,
  };
}

describe("vendorHasListingPricesShown", () => {
  it("is true when initial or renewal is set", () => {
    expect(vendorHasListingPricesShown(minimalVendor({ slug: "a", name: "A", city: "X", county: "orange", priceInitial: 100 }))).toBe(true);
    expect(vendorHasListingPricesShown(minimalVendor({ slug: "b", name: "B", city: "X", county: "orange", priceRenewal: 50 }))).toBe(true);
  });

  it("is false when both initial and renewal are absent", () => {
    expect(vendorHasListingPricesShown(minimalVendor({ slug: "c", name: "C", city: "X", county: "orange", priceMin: 99 }))).toBe(false);
  });
});

describe("getRelatedVendorsForVendorProfile", () => {
  const origin = minimalVendor({
    slug: "origin",
    name: "Origin",
    city: "Los Angeles",
    county: "los-angeles",
    countiesServed: ["los-angeles"],
  });

  it("excludes self and non-county vendors", () => {
    const pool = [
      origin,
      minimalVendor({
        slug: "near-no-price",
        name: "Zebra",
        city: "Los Angeles",
        county: "los-angeles",
      }),
      minimalVendor({
        slug: "other-county",
        name: "Far",
        city: "Irvine",
        county: "orange",
        countiesServed: ["orange"],
      }),
    ];
    const picked = getRelatedVendorsForVendorProfile(origin, pool, 3);
    expect(picked.map((v) => v.slug)).toEqual(["near-no-price"]);
  });

  it("prioritizes priced vendors then closer cities", () => {
    const pool = [
      origin,
      minimalVendor({
        slug: "far-priced",
        name: "Far Priced",
        city: "Oakland",
        county: "los-angeles",
        countiesServed: ["los-angeles"],
        priceInitial: 300,
      }),
      minimalVendor({
        slug: "near-priced",
        name: "Near Priced",
        city: "Los Angeles",
        county: "los-angeles",
        countiesServed: ["los-angeles"],
        priceInitial: 200,
      }),
      minimalVendor({
        slug: "near-no-price",
        name: "Near No Price",
        city: "Los Angeles",
        county: "los-angeles",
      }),
    ];
    const picked = getRelatedVendorsForVendorProfile(origin, pool, 3);
    expect(picked.map((v) => v.slug)).toEqual(["near-priced", "far-priced", "near-no-price"]);
  });

  it("returns empty when anchor county is missing", () => {
    const broken = minimalVendor({
      slug: "x",
      name: "X",
      city: "",
      county: "",
      countiesServed: [],
    });
    const pool = [
      broken,
      minimalVendor({ slug: "y", name: "Y", city: "Los Angeles", county: "los-angeles" }),
    ];
    expect(getRelatedVendorsForVendorProfile(broken, pool, 3)).toEqual([]);
  });
});
