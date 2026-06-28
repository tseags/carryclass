import { describe, expect, it } from "vitest";
import { normalizeCountiesServed } from "./counties";

describe("normalizeCountiesServed", () => {
  it("keeps only valid county slugs", () => {
    expect(normalizeCountiesServed(["los-angeles", "not-a-county", "orange"])).toEqual([
      "los-angeles",
      "orange",
    ]);
  });

  it("dedupes while preserving first-seen order", () => {
    expect(
      normalizeCountiesServed(["orange", "los-angeles", "orange"])
    ).toEqual(["orange", "los-angeles"]);
  });

  it("lowercases and trims input values", () => {
    expect(normalizeCountiesServed([" Los-Angeles ", "SAN-DIEGO"])).toEqual([
      "los-angeles",
      "san-diego",
    ]);
  });

  it("ignores non-string entries", () => {
    expect(normalizeCountiesServed(["fresno", 42, null, undefined])).toEqual(["fresno"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeCountiesServed("los-angeles")).toEqual([]);
    expect(normalizeCountiesServed(null)).toEqual([]);
    expect(normalizeCountiesServed(undefined)).toEqual([]);
  });
});
