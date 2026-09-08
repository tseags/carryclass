import { describe, expect, it } from "vitest";
import {
  extractCarryClassSlugFingerprint,
  findVendorBySlugFingerprint,
  parseCountySlugFromCarryClassVendorSlug,
} from "./carryclass-vendor-slug";

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

describe("extractCarryClassSlugFingerprint", () => {
  it("returns the trailing 10-hex fingerprint", () => {
    expect(
      extractCarryClassSlugFingerprint("ccw-permit-instruction-evans-gun-world-7c9a3219a3")
    ).toBe("7c9a3219a3");
  });

  it("returns null without a fingerprint suffix", () => {
    expect(extractCarryClassSlugFingerprint("legacy-vendor-slug")).toBeNull();
  });
});

describe("findVendorBySlugFingerprint", () => {
  const vendors = [
    { slug: "ccw-permit-instruction-7c9a3219a3" },
    { slug: "evans-gun-world-b408da7356" },
  ];

  it("finds the unique vendor for a stale name-prefix slug fingerprint", () => {
    expect(findVendorBySlugFingerprint(vendors, "7c9a3219a3")).toEqual(vendors[0]);
  });

  it("returns null when the fingerprint is missing or ambiguous", () => {
    expect(findVendorBySlugFingerprint(vendors, "deadbeef01")).toBeNull();
    expect(
      findVendorBySlugFingerprint(
        [...vendors, { slug: "other-name-7c9a3219a3" }],
        "7c9a3219a3"
      )
    ).toBeNull();
  });
});
