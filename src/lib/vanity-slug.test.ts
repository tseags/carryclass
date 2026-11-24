import { describe, expect, it } from "vitest";
import { isReservedSlug, RESERVED_SLUGS } from "@/lib/reserved-slugs";
import { normalize, validate, VANITY_SLUG_PATTERN } from "@/lib/vanity-slug";
import {
  shouldAttemptVanityLookup,
  vanitySegmentFromPathname,
} from "@/lib/vanity-redirect";

describe("normalize", () => {
  it("trims and lowercases", () => {
    expect(normalize("  McBride ")).toBe("mcbride");
  });
});

describe("validate", () => {
  it("accepts short lowercase slugs", () => {
    expect(validate("mcbride")).toEqual({ ok: true, slug: "mcbride" });
    expect(validate("John-McBride")).toEqual({ ok: true, slug: "john-mcbride" });
  });

  it("rejects length outside 3–30", () => {
    expect(validate("ab").ok).toBe(false);
    expect(validate("a".repeat(31)).ok).toBe(false);
  });

  it("rejects invalid characters and hyphen placement", () => {
    expect(validate("mc_bride").ok).toBe(false);
    expect(validate("-mcbride").ok).toBe(false);
    expect(validate("mcbride-").ok).toBe(false);
    expect(validate("mc--bride").ok).toBe(false);
    expect(VANITY_SLUG_PATTERN.test("mcbride")).toBe(true);
  });

  it("rejects reserved top-level routes", () => {
    expect(validate("instructors").ok).toBe(false);
    expect(validate("login").ok).toBe(false);
    expect(validate("sign-in").ok).toBe(false);
    expect(validate("for-instructors").ok).toBe(false);
    expect(validate("API").ok).toBe(false);
  });
});

describe("reserved slugs", () => {
  it("includes real app routes and extras", () => {
    expect(RESERVED_SLUGS.has("dashboard")).toBe(true);
    expect(RESERVED_SLUGS.has("onboard")).toBe(true);
    expect(RESERVED_SLUGS.has("outreach")).toBe(true);
    expect(RESERVED_SLUGS.has("faqs")).toBe(true);
    expect(RESERVED_SLUGS.has("www")).toBe(true);
    expect(RESERVED_SLUGS.has("_next")).toBe(true);
    expect(isReservedSlug("Sign-Up")).toBe(true);
    expect(isReservedSlug("mcbride")).toBe(false);
  });
});

describe("shouldAttemptVanityLookup", () => {
  it("allows single-segment candidate paths", () => {
    expect(shouldAttemptVanityLookup("/mcbride")).toBe(true);
    expect(shouldAttemptVanityLookup("/mcbride/")).toBe(true);
    expect(vanitySegmentFromPathname("/McBride")).toBe("mcbride");
  });

  it("skips reserved routes, assets, and multi-segment paths", () => {
    expect(shouldAttemptVanityLookup("/instructors")).toBe(false);
    expect(shouldAttemptVanityLookup("/login")).toBe(false);
    expect(shouldAttemptVanityLookup("/sign-in")).toBe(false);
    expect(shouldAttemptVanityLookup("/api/health")).toBe(false);
    expect(shouldAttemptVanityLookup("/_next/static/chunk.js")).toBe(false);
    expect(shouldAttemptVanityLookup("/favicon.ico")).toBe(false);
    expect(shouldAttemptVanityLookup("/instructors/mcbride")).toBe(false);
    expect(shouldAttemptVanityLookup("/")).toBe(false);
    expect(shouldAttemptVanityLookup("/asdfgh")).toBe(true);
  });
});
