import { getCountyDisplayName } from "@/data/counties";
import type { Coordinates } from "@/data/vendor-coordinates";
import type { Vendor } from "@/types";
import {
  resolveVendorLocation,
  type ResolveVendorLocationDeps,
  type VendorLocationInput,
  type VendorLocationSource,
} from "@/lib/vendor-location";

export interface VendorMapPin {
  pinKey: string;
  vendorId: string;
  slug: string;
  name: string;
  coordinates: Coordinates;
  label: string;
  source: VendorLocationSource;
}

function locationInputKey(input: VendorLocationInput): string {
  return [input.address, input.city, input.county, input.state]
    .map((part) => (part ?? "").trim().toLowerCase())
    .join("|");
}

/** Distinct location inputs for map pins (address blocks first, then city/county fallback). */
export function getVendorMapLocationInputs(vendor: Vendor): VendorLocationInput[] {
  const state = vendor.state?.trim() || "CA";
  const seen = new Set<string>();
  const inputs: VendorLocationInput[] = [];

  const add = (input: VendorLocationInput) => {
    const key = locationInputKey(input);
    if (seen.has(key)) return;
    seen.add(key);
    inputs.push(input);
  };

  if (vendor.address?.trim()) {
    add({
      address: vendor.address.trim(),
      city: vendor.city,
      county: vendor.county,
      state,
    });
  }

  for (const block of vendor.countyContacts ?? []) {
    if (!block.address?.trim()) continue;
    const county = block.counties[0] ?? vendor.county;
    add({
      address: block.address.trim(),
      city: block.city ?? vendor.city,
      county,
      state,
    });
  }

  if (inputs.length === 0) {
    add({ city: vendor.city, county: vendor.county, state });
  }

  return inputs;
}

function formatPinLabel(vendor: Vendor, input: VendorLocationInput): string {
  const address = input.address?.trim();
  if (address) {
    const city = input.city?.trim() || vendor.city?.trim();
    return city ? `${address}, ${city}` : address;
  }
  const city = input.city?.trim() || vendor.city?.trim();
  const countySlug = input.county?.trim() || vendor.county;
  const countyName = countySlug ? getCountyDisplayName(countySlug) : "";
  if (city && countyName) return `${city}, ${countyName} County`;
  if (city) return city;
  if (countyName) return `${countyName} County`;
  return vendor.name;
}

export async function resolveVendorMapPins(
  vendors: Vendor[],
  deps: ResolveVendorLocationDeps
): Promise<VendorMapPin[]> {
  const pins: VendorMapPin[] = [];

  for (const vendor of vendors) {
    const inputs = getVendorMapLocationInputs(vendor);

    for (const [inputIndex, input] of inputs.entries()) {
      const resolution = await resolveVendorLocation(input, deps);
      if (!resolution.coordinates) continue;

      pins.push({
        pinKey: inputs.length > 1 ? `${vendor.id}-${inputIndex}` : vendor.id,
        vendorId: vendor.id,
        slug: vendor.slug,
        name: vendor.name,
        coordinates: resolution.coordinates,
        label: formatPinLabel(vendor, input),
        source: resolution.source,
      });
    }
  }

  return pins;
}
