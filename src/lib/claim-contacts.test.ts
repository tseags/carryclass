import { describe, expect, it } from "vitest";
import {
  getListingClaimContacts,
  maskEmail,
  maskPhone,
  normalizeListingPhone,
  toE164Us,
} from "@/lib/claim-contacts";
import type { Vendor } from "@/types";

function baseVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    slug: "acme-alameda-abcdefghij",
    name: "Acme Training",
    type: "instructor",
    city: "Oakland",
    county: "alameda",
    state: "CA",
    countiesServed: ["alameda"],
    classTypes: ["initial"],
    formats: ["in-person"],
    createdAt: "2026-01-01",
    ...overrides,
  };
}

describe("claim-contacts", () => {
  it("normalizes US phones to 10 digits and E.164", () => {
    expect(normalizeListingPhone("(925) 555-1212")).toBe("9255551212");
    expect(normalizeListingPhone("1-925-555-1212")).toBe("9255551212");
    expect(toE164Us("(925) 555-1212")).toBe("+19255551212");
  });

  it("masks email and phone without revealing full values", () => {
    expect(maskEmail("Owner@Example.COM")).toBe("o***@example.com");
    expect(maskPhone("9255551212")).toBe("(***) ***-1212");
  });

  it("only exposes channels present on the listing", () => {
    const both = getListingClaimContacts(
      baseVendor({ email: "a@b.com", phone: "925-555-1212" })
    );
    expect(both.channels).toEqual(["email", "phone"]);
    expect(both.email).toBe("a@b.com");
    expect(both.phoneE164).toBe("+19255551212");

    const none = getListingClaimContacts(baseVendor());
    expect(none.channels).toEqual([]);
  });
});
