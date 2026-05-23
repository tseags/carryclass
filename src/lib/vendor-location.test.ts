import { describe, expect, it, vi } from "vitest";
import { resolveVendorLocation } from "@/lib/vendor-location";

describe("resolveVendorLocation", () => {
  it("prefers address geocode when address is present", async () => {
    const geocode = vi
      .fn<(_: string) => Promise<[number, number] | null>>()
      .mockImplementation(async (query) => {
        if (query.includes("Main St")) return [34.101, -118.31];
        return null;
      });

    const result = await resolveVendorLocation(
      { address: "123 Main St", city: "Los Angeles", county: "los-angeles", state: "CA" },
      { geocode }
    );

    expect(result.coordinates).toEqual([34.101, -118.31]);
    expect(result.source).toBe("address-geocode");
    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it("falls back to city geocode when address is missing", async () => {
    const geocode = vi
      .fn<(_: string) => Promise<[number, number] | null>>()
      .mockResolvedValue([37.7749, -122.4194]);

    const result = await resolveVendorLocation(
      { city: "San Francisco", county: "san-francisco", state: "CA" },
      { geocode }
    );

    expect(result.coordinates).toEqual([37.7749, -122.4194]);
    expect(result.source).toBe("city-geocode");
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledWith("San Francisco, CA, USA");
  });

  it("uses county center when city is missing", async () => {
    const geocode = vi.fn<(_: string) => Promise<[number, number] | null>>().mockResolvedValue(null);

    const result = await resolveVendorLocation(
      { county: "orange", state: "CA" },
      { geocode }
    );

    expect(result.coordinates).toEqual([33.7175, -117.8311]);
    expect(result.source).toBe("county-center");
    expect(result.resolvedQuery).toBe("Orange County, CA, USA");
    expect(geocode).toHaveBeenCalledWith("Orange County, CA, USA");
  });

  it("falls back to county center when city geocode fails", async () => {
    const geocode = vi.fn<(_: string) => Promise<[number, number] | null>>().mockResolvedValue(null);

    const result = await resolveVendorLocation(
      { city: "Unknown City", county: "orange", state: "CA" },
      { geocode }
    );

    expect(result.coordinates).toEqual([33.7175, -117.8311]);
    expect(result.source).toBe("county-center");
    expect(geocode).toHaveBeenCalledWith("Unknown City, CA, USA");
    expect(geocode).toHaveBeenCalledWith("Orange County, CA, USA");
  });

  it("uses city center before county when geocode fails for a known city", async () => {
    const geocode = vi.fn<(_: string) => Promise<[number, number] | null>>().mockResolvedValue(null);

    const result = await resolveVendorLocation(
      { city: "Irvine", county: "orange", state: "CA" },
      { geocode }
    );

    expect(result.coordinates).toEqual([33.6846, -117.8265]);
    expect(result.source).toBe("city-center");
  });

  it("returns none when geocode fails and no fallback coordinates exist", async () => {
    const geocode = vi.fn<(_: string) => Promise<[number, number] | null>>().mockResolvedValue(null);

    const result = await resolveVendorLocation(
      { city: "Unknown City", county: "unknown-county", state: "CA" },
      { geocode }
    );

    expect(result.coordinates).toBeNull();
    expect(result.source).toBe("none");
    expect(result.googleMapsQuery).toBe("Unknown City, CA, USA");
  });
});
