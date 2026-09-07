import { describe, expect, it } from "vitest";
import type { Vendor } from "@/types";
import {
  filterVendorsByAudience,
  isVendorVisibleToAudience,
} from "./vendor-audience";

function makeVendor(partial: Partial<Vendor> & Pick<Vendor, "id" | "name" | "slug">): Vendor {
  const { id, name, slug } = partial;
  return {
    type: "instructor",
    city: "Test City",
    county: "alpine",
    state: "CA",
    countiesServed: ["alpine"],
    classTypes: ["both"],
    formats: ["in-person"],
    createdAt: "2026-01-01",
    ...partial,
    id,
    name,
    slug,
  };
}

describe("filterVendorsByAudience", () => {
  const visible = makeVendor({ id: "1", name: "Public Instructor", slug: "public-alpine-abc" });
  const hidden = makeVendor({
    id: "2",
    name: "INTERNAL — Claim Funnel Test",
    slug: "internal-alpine-def",
    hiddenFromDirectory: true,
  });

  it("excludes hidden rows for public audience", () => {
    expect(filterVendorsByAudience([visible, hidden], "public")).toEqual([visible]);
  });

  it("includes hidden rows for claim audience", () => {
    expect(filterVendorsByAudience([visible, hidden], "claim")).toEqual([visible, hidden]);
  });

  it("defaults to public audience", () => {
    expect(filterVendorsByAudience([visible, hidden])).toEqual([visible]);
  });
});

describe("isVendorVisibleToAudience", () => {
  const hidden = makeVendor({
    id: "2",
    name: "INTERNAL — Claim Funnel Test",
    slug: "internal-alpine-def",
    hiddenFromDirectory: true,
  });

  it("hides directory-hidden vendors from public slug lookup", () => {
    expect(isVendorVisibleToAudience(hidden, "public")).toBe(false);
  });

  it("allows claim flows to resolve hidden vendors", () => {
    expect(isVendorVisibleToAudience(hidden, "claim")).toBe(true);
  });
});
