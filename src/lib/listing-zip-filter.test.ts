import { describe, expect, it } from "vitest";
import {
  buildZipCountyListingRedirectPath,
  getCountySlugForListingZipSearch,
} from "@/lib/listing-zip-filter";

describe("getCountySlugForListingZipSearch", () => {
  it("resolves exact ZIP searches", () => {
    expect(getCountySlugForListingZipSearch({ search: "92648" })).toBe("orange");
  });

  it("leaves regular keyword search unchanged", () => {
    expect(getCountySlugForListingZipSearch({ search: "instructor" })).toBeNull();
  });
});

describe("buildZipCountyListingRedirectPath", () => {
  it("canonicalizes instructor ZIP searches to county filters", () => {
    expect(
      buildZipCountyListingRedirectPath({
        basePath: "/instructors",
        county: "orange",
        searchParams: {
          search: "92648",
          classType: "initial",
        },
      })
    ).toBe("/instructors?county=orange&classType=initial");
  });

  it("preserves compatible filters and drops incompatible city/search params", () => {
    expect(
      buildZipCountyListingRedirectPath({
        basePath: "/instructors",
        county: "orange",
        searchParams: {
          search: "92648",
          city: "Long Beach",
          classType: "initial",
          sort: "name",
          view: "map",
        },
        validCities: ["Huntington Beach"],
      })
    ).toBe("/instructors?county=orange&classType=initial&sort=name&view=map");
  });

  it("keeps compatible city params using the canonical city label", () => {
    expect(
      buildZipCountyListingRedirectPath({
        basePath: "/instructors",
        county: "orange",
        searchParams: {
          search: "92648",
          city: "huntington beach",
          format: "in-person",
        },
        validCities: ["Huntington Beach"],
      })
    ).toBe("/instructors?county=orange&city=Huntington+Beach&format=in-person");
  });

  it("builds county-page redirects without a county query param", () => {
    expect(
      buildZipCountyListingRedirectPath({
        basePath: "/ca/orange",
        county: "orange",
        searchParams: {
          search: "92648",
          priceListed: "1",
        },
        includeCountyParam: false,
      })
    ).toBe("/ca/orange?priceListed=1");
  });
});
