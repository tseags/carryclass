import { describe, expect, it, vi } from "vitest";
import { getVendorMapLocationInputs, resolveVendorMapPins } from "@/lib/vendor-map-pins";
import type { Vendor } from "@/types";

function makeVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    slug: "test-vendor",
    name: "Test Vendor",
    type: "instructor",
    city: "Irvine",
    county: "orange",
    state: "CA",
    countiesServed: ["orange"],
    classTypes: ["initial"],
    formats: ["in-person"],
    createdAt: "2024-01-01",
    ...overrides,
  };
}

describe("getVendorMapLocationInputs", () => {
  it("includes street address when present", () => {
    const inputs = getVendorMapLocationInputs(
      makeVendor({ address: "123 Main St" })
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0].address).toBe("123 Main St");
  });

  it("includes county contact addresses", () => {
    const inputs = getVendorMapLocationInputs(
      makeVendor({
        countyContacts: [
          { counties: ["san-diego"], address: "500 Harbor Dr", city: "San Diego" },
        ],
      })
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0].address).toBe("500 Harbor Dr");
    expect(inputs[0].county).toBe("san-diego");
  });

  it("dedupes identical address blocks", () => {
    const inputs = getVendorMapLocationInputs(
      makeVendor({
        address: "123 Main St",
        countyContacts: [{ counties: ["orange"], address: "123 Main St", city: "Irvine" }],
      })
    );
    expect(inputs).toHaveLength(1);
  });

  it("falls back to city and county when no address", () => {
    const inputs = getVendorMapLocationInputs(makeVendor());
    expect(inputs).toEqual([{ city: "Irvine", county: "orange", state: "CA" }]);
  });
});

describe("resolveVendorMapPins", () => {
  it("geocodes using address when available", async () => {
    const geocode = vi
      .fn<(_: string) => Promise<[number, number] | null>>()
      .mockImplementation(async (query) => {
        if (query.includes("Main St")) return [33.68, -117.82];
        return null;
      });

    const pins = await resolveVendorMapPins(
      [makeVendor({ address: "123 Main St" })],
      { geocode }
    );

    expect(pins).toHaveLength(1);
    expect(pins[0].coordinates).toEqual([33.68, -117.82]);
    expect(pins[0].source).toBe("address-geocode");
    expect(pins[0].label).toContain("123 Main St");
  });

  it("falls back to city when no address is listed", async () => {
    const geocode = vi
      .fn<(_: string) => Promise<[number, number] | null>>()
      .mockImplementation(async (query) => {
        if (query === "Irvine, CA, USA") return [33.68, -117.82];
        return null;
      });

    const pins = await resolveVendorMapPins([makeVendor()], { geocode });

    expect(pins).toHaveLength(1);
    expect(pins[0].source).toBe("city-geocode");
    expect(pins[0].label).toBe("Irvine, Orange County");
  });

  it("falls back to county when city geocode fails", async () => {
    const geocode = vi.fn<(_: string) => Promise<[number, number] | null>>().mockResolvedValue(null);

    const pins = await resolveVendorMapPins(
      [makeVendor({ city: "Unknown City" })],
      { geocode }
    );

    expect(pins).toHaveLength(1);
    expect(pins[0].source).toBe("county-center");
    expect(pins[0].coordinates).toEqual([33.7175, -117.8311]);
    expect(pins[0].label).toBe("Unknown City, Orange County");
  });
});
