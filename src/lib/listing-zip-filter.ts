import type { CaliforniaCountySlug } from "@/data/counties";
import { getCountySlugForCaliforniaZip } from "@/data/california-zip-counties";

type ListingSearchParams = Record<string, string | string[] | undefined>;

const PRESERVED_FILTER_PARAMS = [
  "classType",
  "format",
  "category",
  "priceMax",
  "priceListed",
  "sort",
  "view",
] as const;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizedParam(value: string | string[] | undefined): string | undefined {
  const single = firstParam(value)?.trim();
  return single || undefined;
}

function cityAllowedForCounty(
  city: string | undefined,
  validCities: string[] | undefined
): string | null {
  if (!city || !validCities) return null;
  return validCities.find((candidate) => candidate.toLowerCase() === city.toLowerCase()) ?? null;
}

export function getCountySlugForListingZipSearch(
  searchParams: ListingSearchParams
): CaliforniaCountySlug | null {
  const search = normalizedParam(searchParams.search);
  return search ? getCountySlugForCaliforniaZip(search) : null;
}

export function buildZipCountyListingRedirectPath({
  basePath,
  county,
  searchParams,
  includeCountyParam = true,
  validCities,
}: {
  basePath: string;
  county: CaliforniaCountySlug;
  searchParams: ListingSearchParams;
  includeCountyParam?: boolean;
  validCities?: string[];
}): string {
  const params = new URLSearchParams();

  if (includeCountyParam) {
    params.set("county", county);
  }

  const city = cityAllowedForCounty(normalizedParam(searchParams.city), validCities);
  if (city) {
    params.set("city", city);
  }

  for (const key of PRESERVED_FILTER_PARAMS) {
    const value = normalizedParam(searchParams[key]);
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
