import { describe, expect, it } from "vitest";
import type { Vendor } from "@/types";
import { VENDOR_MERGE_OVERRIDES } from "@/data/vendor-merge-overrides";
import {
  formatCountyContactLabel,
  getRowGroupKey,
  mergeCanonicalVendors,
  normalizeVendorName,
  normalizeWebsiteHost,
  scoreCandidateRow,
  sortVendorCountyContacts,
} from "./merge-canonical-vendors";

function makeRow(partial: Partial<Vendor> & Pick<Vendor, "id" | "name" | "county">): Vendor {
  const { id, name, county } = partial;
  return {
    slug: `${id}-slug`,
    type: "instructor",
    city: "",
    state: "CA",
    countiesServed: [county],
    classTypes: ["both"],
    formats: ["in-person"],
    createdAt: "2024-01-01",
    ...partial,
    id,
    name,
    county,
  };
}

describe("normalizeWebsiteHost", () => {
  it("lowercases and strips www / protocol / path", () => {
    expect(normalizeWebsiteHost("https://WWW.Example.com/foo")).toBe("example.com");
    expect(normalizeWebsiteHost("example.com")).toBe("example.com");
    expect(normalizeWebsiteHost("http://sub.example.com")).toBe("sub.example.com");
  });

  it("returns empty string for blanks/invalid", () => {
    expect(normalizeWebsiteHost("")).toBe("");
    expect(normalizeWebsiteHost(undefined)).toBe("");
    expect(normalizeWebsiteHost("   ")).toBe("");
  });
});

describe("normalizeVendorName", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeVendorName("  ACME   Training  ")).toBe("acme training");
  });
});

describe("getRowGroupKey", () => {
  it("prefers website host over email and name", () => {
    const row = makeRow({
      id: "1",
      name: "Acme",
      county: "orange",
      website: "https://acme.com",
      email: "info@acme.com",
    });
    expect(getRowGroupKey(row)).toBe("website:acme.com");
  });

  it("falls back to email then name then row id", () => {
    expect(
      getRowGroupKey(makeRow({ id: "1", name: "Acme", county: "orange", email: "I@A.com" }))
    ).toBe("email:i@a.com");
    expect(
      getRowGroupKey(makeRow({ id: "1", name: "  Acme  Co  ", county: "orange" }))
    ).toBe("name:acme co");
    expect(getRowGroupKey(makeRow({ id: "1", name: "", county: "orange" }))).toBe("row:1");
  });

  it("respects forceSeparate and forceMerge overrides", () => {
    const a = makeRow({ id: "row-a", name: "Acme", county: "orange", website: "https://x.com" });
    const b = makeRow({ id: "row-b", name: "Acme", county: "san-diego", website: "https://x.com" });
    expect(
      getRowGroupKey(a, { forceSeparate: ["row-a"] })
    ).toBe("force-separate:row-a");
    expect(
      getRowGroupKey(b, { forceMerge: [{ label: "acme-special", rowIds: ["row-a", "row-b"] }] })
    ).toBe("force-merge:acme-special");
  });
});

describe("scoreCandidateRow", () => {
  it("rewards sane prices, confidence, website, description, images", () => {
    const high = makeRow({
      id: "high",
      name: "High",
      county: "orange",
      priceInitial: 250,
      priceRenewal: 150,
      enrichmentConfidence: "high",
      website: "https://x.com",
      description: "x".repeat(80),
      photos: ["a"],
      address: "1 Main St",
      phone: "555",
    });
    const low = makeRow({
      id: "low",
      name: "Low",
      county: "orange",
      priceInitial: 1,
      priceRenewal: 9999,
    });
    expect(scoreCandidateRow(high)).toBeGreaterThan(scoreCandidateRow(low));
  });
});

describe("mergeCanonicalVendors", () => {
  it("merges two rows sharing a website into one canonical vendor with both counties", () => {
    const sd = makeRow({
      id: "sd",
      name: "Acme CCW",
      county: "san-diego",
      countiesServed: ["san-diego"],
      website: "https://acme-ccw.com",
      address: "100 Main St",
      phone: "(619) 555-1111",
      city: "San Diego",
    });
    const oc = makeRow({
      id: "oc",
      name: "Acme CCW",
      county: "orange",
      countiesServed: ["orange"],
      website: "https://www.acme-ccw.com",
      address: "200 OC Blvd",
      phone: "(714) 555-2222",
      city: "Irvine",
    });

    const merged = mergeCanonicalVendors([sd, oc]);
    expect(merged).toHaveLength(1);
    const v = merged[0];
    expect(v.countiesServed.sort()).toEqual(["orange", "san-diego"]);
    expect(v.countyContacts).toHaveLength(2);
    expect(v.countyContacts?.map((c) => c.counties[0]).sort()).toEqual([
      "orange",
      "san-diego",
    ]);
    expect(v.slug).toMatch(/^acme-ccw-/);
    expect(v.id).toMatch(/^ccvd-/);
  });

  it("dedupes contact blocks when address+phone match across counties", () => {
    const shared = {
      website: "https://shared.com",
      address: "100 Main St",
      phone: "(619) 555-1111",
      city: "San Diego",
    } as const;
    const merged = mergeCanonicalVendors([
      makeRow({ id: "sd", name: "Shared", county: "san-diego", ...shared }),
      makeRow({ id: "oc", name: "Shared", county: "orange", ...shared }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].countyContacts).toHaveLength(1);
    expect(merged[0].countyContacts?.[0].counties.sort()).toEqual([
      "orange",
      "san-diego",
    ]);
    expect(merged[0].countiesServed.sort()).toEqual(["orange", "san-diego"]);
  });

  it("does not merge unrelated rows (different sites, different names, no email)", () => {
    const a = makeRow({
      id: "a",
      name: "Alpha CCW",
      county: "orange",
      website: "https://alpha.com",
    });
    const b = makeRow({
      id: "b",
      name: "Beta CCW",
      county: "orange",
      website: "https://beta.com",
    });
    const merged = mergeCanonicalVendors([a, b]);
    expect(merged.map((v) => v.name).sort()).toEqual(["Alpha CCW", "Beta CCW"]);
  });

  it("filters junk rows (address-as-name, failed crawl)", () => {
    const ok = makeRow({ id: "ok", name: "Good Vendor", county: "orange", website: "https://ok.com" });
    const addressName = makeRow({
      id: "bad-addr",
      name: "123 Main Street",
      county: "orange",
      website: "https://bad.com",
    });
    const failed = makeRow({
      id: "bad-crawl",
      name: "Bad Crawl",
      county: "orange",
      website: "https://failed.com",
      crawlStatus: "failed",
    });

    const merged = mergeCanonicalVendors([ok, addressName, failed]);
    expect(merged.map((v) => v.name)).toEqual(["Good Vendor"]);
  });

  it("keeps vendor names that start with numbers but are not addresses", () => {
    const rows = [
      makeRow({
        id: "29og",
        name: "29 Outdoor Gear",
        county: "solano",
        website: "https://29outdoorgear.com",
      }),
      makeRow({
        id: "7seas",
        name: "7 Seas Training",
        county: "orange",
        website: "https://7seas.com",
      }),
      makeRow({
        id: "101ds",
        name: "101 Defensive Solutions",
        county: "san-diego",
        website: "https://101defense.com",
      }),
    ];
    const merged = mergeCanonicalVendors(rows);
    expect(merged.map((v) => v.name).sort()).toEqual([
      "101 Defensive Solutions",
      "29 Outdoor Gear",
      "7 Seas Training",
    ]);
  });

  it("filters address-like names with street suffixes", () => {
    const ok = makeRow({ id: "ok", name: "Good Vendor", county: "orange", website: "https://ok.com" });
    const addressRows = [
      makeRow({ id: "a1", name: "123 Main Street", county: "orange", website: "https://bad1.com" }),
      makeRow({ id: "a2", name: "456 Broadway Ave", county: "orange", website: "https://bad2.com" }),
      makeRow({ id: "a3", name: "100 Main St", county: "orange", website: "https://bad3.com" }),
    ];
    const merged = mergeCanonicalVendors([ok, ...addressRows]);
    expect(merged.map((v) => v.name)).toEqual(["Good Vendor"]);
  });

  it("groups by name when website/email are missing", () => {
    const a = makeRow({
      id: "a",
      name: "Same Name LLC",
      county: "orange",
      address: "1 OC Way",
      phone: "(714) 555-1",
    });
    const b = makeRow({
      id: "b",
      name: "Same Name LLC",
      county: "san-diego",
      address: "2 SD Way",
      phone: "(619) 555-2",
    });
    const merged = mergeCanonicalVendors([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].countiesServed.sort()).toEqual(["orange", "san-diego"]);
    expect(merged[0].countyContacts).toHaveLength(2);
  });

  it("picks the higher-scoring row as the winner for display fields", () => {
    const weak = makeRow({
      id: "weak",
      name: "Weak Row",
      county: "san-diego",
      website: "https://shared.com",
      description: "short",
    });
    const strong = makeRow({
      id: "strong",
      name: "Strong Row",
      county: "orange",
      website: "https://shared.com",
      description: "Detailed description ".repeat(10),
      priceInitial: 250,
      priceRenewal: 150,
      enrichmentConfidence: "high",
      photos: ["x"],
      address: "9 OC Rd",
      phone: "(714) 555-9",
    });
    const merged = mergeCanonicalVendors([weak, strong]);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("Strong Row");
    expect(merged[0].description?.startsWith("Detailed description")).toBe(true);
  });

  it("union-counties only includes valid CA county slugs", () => {
    const a = makeRow({
      id: "a",
      name: "X",
      county: "orange",
      countiesServed: ["orange", "not-a-county"],
      website: "https://x.com",
    });
    const merged = mergeCanonicalVendors([a]);
    expect(merged[0].countiesServed).toEqual(["orange"]);
  });

  it("produces stable id/slug across runs for the same group", () => {
    const rows = [
      makeRow({ id: "x1", name: "Stable", county: "orange", website: "https://stable.com" }),
      makeRow({ id: "x2", name: "Stable", county: "san-diego", website: "https://stable.com" }),
    ];
    const a = mergeCanonicalVendors(rows);
    const b = mergeCanonicalVendors(rows.slice().reverse());
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].slug).toBe(b[0].slug);
  });

  it("force-merges Safe Insight across safeinsight.net and myshopify with pinned pricing", () => {
    const counties = [
      "el-dorado",
      "lassen",
      "los-angeles",
      "orange",
      "tuolumne",
      "ventura",
    ] as const;
    const rows = [
      makeRow({
        id: "3df1d4e8-fd9b-45e2-b3b5-cd3105d22e1f",
        name: "Safe Insight",
        county: "el-dorado",
        website: "https://safeinsight.myshopify.com/collections/non-resident-ccw",
        priceInitial: 400,
        priceRenewal: 299,
        updatedAt: "2026-04-13T04:37:12Z",
      }),
      makeRow({
        id: "07cb90d4-6b0c-4cc9-9468-0b15a8737281",
        name: "Safe Insight",
        county: "lassen",
        website: "https://www.safeinsight.net",
        phone: "877-217-7233",
        priceInitial: 99,
        priceRenewal: 300,
      }),
      makeRow({
        id: "b1b6d881-60b6-4a4c-b8a9-0697c03a5b17",
        name: "Safe Insight",
        county: "los-angeles",
        website: "https://www.safeinsight.net",
        phone: "877-217-7233",
        city: "Artesia",
      }),
      makeRow({
        id: "2dc9be00-444c-43b1-b110-04f411302d66",
        name: "Safe Insight, LLC",
        county: "orange",
        website: "https://www.safeinsight.net",
        phone: "877-217-7233",
        city: "Cypress",
        priceInitial: 99,
        priceRenewal: 300,
        updatedAt: "2026-04-13T20:06:39Z",
      }),
      makeRow({
        id: "0508b6ac-6960-4189-b7e1-fe07ee395e01",
        name: "Safe Insight",
        county: "tuolumne",
        website: "https://safeinsight.net/california-ccw",
        phone: "877-217-7233",
      }),
      makeRow({
        id: "083fd6c2-4b39-4fb7-806e-8612ee724281",
        name: "Safe Insight",
        county: "ventura",
        website: "https://www.safeinsight.net",
        phone: "877-217-7233",
        priceInitial: 99,
        priceRenewal: 300,
      }),
    ];

    const withoutOverride = mergeCanonicalVendors(rows);
    expect(withoutOverride.length).toBeGreaterThan(1);

    const merged = mergeCanonicalVendors(rows, { overrides: VENDOR_MERGE_OVERRIDES });
    expect(merged).toHaveLength(1);
    const v = merged[0];
    expect(v.countiesServed.sort()).toEqual([...counties].sort());
    expect(v.priceInitial).toBe(400);
    expect(v.priceRenewal).toBe(299);
    expect(v.website).toBe("https://www.safeinsight.net");
    expect(v.countyContacts?.length).toBeGreaterThan(0);
    expect(v.countyContacts?.[0].phone).toBe("877-217-7233");
    expect(v.countyContacts?.[0].counties).toEqual(
      expect.arrayContaining(["los-angeles", "orange"])
    );
  });

  it("forceSeparate keeps a row standalone even when keys collide", () => {
    const a = makeRow({
      id: "share-a",
      name: "Brand",
      county: "orange",
      website: "https://franchise.com",
    });
    const b = makeRow({
      id: "share-b",
      name: "Brand",
      county: "san-diego",
      website: "https://franchise.com",
    });
    const merged = mergeCanonicalVendors([a, b], {
      overrides: { forceSeparate: ["share-a"] },
    });
    expect(merged).toHaveLength(2);
  });
});

describe("formatCountyContactLabel", () => {
  it("formats 1, 2, and 3+ county blocks with singular 'County'", () => {
    expect(formatCountyContactLabel(["san-diego"])).toBe("San Diego County");
    expect(formatCountyContactLabel(["san-diego", "orange"])).toBe("San Diego & Orange County");
    expect(
      formatCountyContactLabel(["san-diego", "orange", "los-angeles"])
    ).toBe("San Diego, Orange & Los Angeles County");
  });

  it("returns empty for empty input", () => {
    expect(formatCountyContactLabel([])).toBe("");
  });
});

describe("sortVendorCountyContacts", () => {
  it("sorts alphabetically by first county display name", () => {
    const sorted = sortVendorCountyContacts([
      { counties: ["san-diego"], address: "A" },
      { counties: ["orange"], address: "B" },
      { counties: ["los-angeles"], address: "C" },
    ]);
    expect(sorted.map((b) => b.counties[0])).toEqual([
      "los-angeles",
      "orange",
      "san-diego",
    ]);
  });
});
