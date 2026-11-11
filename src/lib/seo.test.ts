import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  canonicalForFilteredListing,
  hasActiveSearchParams,
} from "@/lib/seo";
import { serializeJsonLd, websiteJsonLd } from "@/lib/json-ld";

describe("seo helpers", () => {
  it("builds absolute URLs from paths", () => {
    expect(absoluteUrl("/instructors")).toBe(
      "https://www.getcarryclass.com/instructors"
    );
  });

  it("detects active search params", () => {
    expect(hasActiveSearchParams({})).toBe(false);
    expect(hasActiveSearchParams({ county: "sacramento" })).toBe(true);
    expect(hasActiveSearchParams({ search: "  " })).toBe(false);
    expect(hasActiveSearchParams({ search: "smith" })).toBe(true);
  });

  it("returns canonical base path only when filters are active", () => {
    expect(canonicalForFilteredListing("/instructors", {})).toBeUndefined();
    expect(canonicalForFilteredListing("/instructors", { sort: "name" })).toBe(
      "/instructors"
    );
    expect(
      canonicalForFilteredListing("/ca/alameda", { view: "map" })
    ).toBe("/ca/alameda");
  });
});

describe("serializeJsonLd", () => {
  it("escapes script-breaking characters", () => {
    const raw = serializeJsonLd({ note: "</script>" });
    expect(raw).not.toContain("</script>");
    expect(raw).toContain("\\u003c");
  });
});

describe("websiteJsonLd", () => {
  it("declares CarryClass as the preferred Google site name", () => {
    expect(websiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "CarryClass",
      alternateName: ["getcarryclass.com", "www.getcarryclass.com"],
      url: "https://www.getcarryclass.com/",
    });
  });
});
