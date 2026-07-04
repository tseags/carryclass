import { describe, expect, it } from "vitest";
import { getCountySlugForCaliforniaZip } from "@/data/california-zip-counties";

describe("getCountySlugForCaliforniaZip", () => {
  it("maps Orange County ZIP codes to the orange county slug", () => {
    expect(getCountySlugForCaliforniaZip("92648")).toBe("orange");
  });

  it("maps Los Angeles County ZIP codes to the los-angeles county slug", () => {
    expect(getCountySlugForCaliforniaZip("90001")).toBe("los-angeles");
  });

  it("normalizes surrounding whitespace", () => {
    expect(getCountySlugForCaliforniaZip(" 92648 ")).toBe("orange");
  });

  it("returns null for unknown or non-California ZIP codes", () => {
    expect(getCountySlugForCaliforniaZip("10001")).toBeNull();
  });

  it("returns null for non-ZIP search text", () => {
    expect(getCountySlugForCaliforniaZip("Orange County")).toBeNull();
    expect(getCountySlugForCaliforniaZip("92648-1234")).toBeNull();
  });
});
