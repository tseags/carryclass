import { describe, expect, it } from "vitest";
import { parseCountySlugFromCarryClassVendorSlug } from "./carryclass-vendor-slug";

describe("parseCountySlugFromCarryClassVendorSlug", () => {
  it("parses county from a standard CarryClass slug", () => {
    expect(
      parseCountySlugFromCarryClassVendorSlug("joes-ccw-academy-los-angeles-a1b2c3d4e5")
    ).toBe("los-angeles");
  });

  it("matches longer county slugs before shorter prefixes", () => {
    expect(
      parseCountySlugFromCarryClassVendorSlug("range-training-san-luis-obispo-deadbeef01")
    ).toBe("san-luis-obispo");
  });

  it("returns null when fingerprint suffix is missing", () => {
    expect(parseCountySlugFromCarryClassVendorSlug("legacy-vendor-slug")).toBeNull();
  });

  it("returns null when no county segment matches", () => {
    expect(parseCountySlugFromCarryClassVendorSlug("unknown-vendor-ca-abcdef0123")).toBeNull();
  });
});
