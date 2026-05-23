import { getCountyDisplayName } from "@/data/counties";
import {
  getCoordinatesForCity,
  getCoordinatesForCounty,
  type Coordinates,
} from "@/data/vendor-coordinates";

export interface VendorLocationInput {
  address?: string;
  city?: string;
  county?: string;
  state?: string;
}

export type VendorLocationSource =
  | "address-geocode"
  | "city-geocode"
  | "county-geocode"
  | "city-center"
  | "county-center"
  | "none";

export interface VendorLocationResolution {
  coordinates: Coordinates | null;
  source: VendorLocationSource;
  resolvedQuery: string;
  googleMapsQuery: string;
}

interface LocationQuery {
  source: "address-geocode" | "city-geocode" | "county-geocode";
  query: string;
}

export interface ResolveVendorLocationDeps {
  geocode: (query: string) => Promise<Coordinates | null>;
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function joinQuery(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(", ");
}

export function buildVendorLocationQueries(input: VendorLocationInput): {
  geocodeQueries: LocationQuery[];
  countyQuery: string;
  googleMapsQuery: string;
} {
  const address = clean(input.address);
  const city = clean(input.city);
  const countySlug = clean(input.county);
  const state = clean(input.state) || "CA";
  const countyName = countySlug ? getCountyDisplayName(countySlug) : "";

  const addressQuery = address
    ? joinQuery([address, city, state, "USA"])
    : "";
  const cityQuery = city ? joinQuery([city, state, "USA"]) : "";
  const countyQuery = countyName
    ? joinQuery([`${countyName} County`, state, "USA"])
    : joinQuery([state, "USA"]);

  const geocodeQueries: LocationQuery[] = [];
  if (addressQuery) geocodeQueries.push({ source: "address-geocode", query: addressQuery });
  if (cityQuery) geocodeQueries.push({ source: "city-geocode", query: cityQuery });
  if (countyQuery) geocodeQueries.push({ source: "county-geocode", query: countyQuery });

  const googleMapsQuery = geocodeQueries[0]?.query || countyQuery;

  return { geocodeQueries, countyQuery, googleMapsQuery };
}

export async function resolveVendorLocation(
  input: VendorLocationInput,
  deps: ResolveVendorLocationDeps
): Promise<VendorLocationResolution> {
  const city = clean(input.city);
  const county = clean(input.county);
  const { geocodeQueries, countyQuery, googleMapsQuery } = buildVendorLocationQueries(input);

  for (const locationQuery of geocodeQueries) {
    try {
      const coordinates = await deps.geocode(locationQuery.query);
      if (coordinates) {
        return {
          coordinates,
          source: locationQuery.source,
          resolvedQuery: locationQuery.query,
          googleMapsQuery,
        };
      }
    } catch {
      // Swallow geocoder errors and continue fallback chain.
    }
  }

  if (city) {
    const cityCenter = getCoordinatesForCity(city);
    if (cityCenter) {
      return {
        coordinates: cityCenter,
        source: "city-center",
        resolvedQuery: joinQuery([city, clean(input.state) || "CA", "USA"]),
        googleMapsQuery,
      };
    }
  }

  if (county) {
    const countyCenter = getCoordinatesForCounty(county);
    if (countyCenter) {
      return {
        coordinates: countyCenter,
        source: "county-center",
        resolvedQuery: countyQuery,
        googleMapsQuery,
      };
    }
  }

  return {
    coordinates: null,
    source: "none",
    resolvedQuery: countyQuery,
    googleMapsQuery,
  };
}
