import type { Vendor } from "@/types";
import { getCoordinatesForVendor, type Coordinates } from "@/data/vendor-coordinates";

/** Matches PopularVendorCard: real dollar amounts when initial or renewal is set */
export function vendorHasListingPricesShown(v: Vendor): boolean {
  return v.priceInitial != null || v.priceRenewal != null;
}

function vendorServesCounty(v: Vendor, countySlug: string): boolean {
  const s = countySlug.toLowerCase();
  if (!s) return false;
  return v.county.toLowerCase() === s || v.countiesServed.some((c) => c.toLowerCase() === s);
}

function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function anchorCountySlug(vendor: Vendor): string {
  return (vendor.county || vendor.countiesServed[0] || "").toLowerCase();
}

/**
 * Vendors for the profile “More CCW Courses” rail: same county as the viewed listing,
 * prioritizing those with initial/renewal prices shown on cards, then closest geographically.
 */
export function getRelatedVendorsForVendorProfile(
  origin: Vendor,
  allVendors: Vendor[],
  limit = 3
): Vendor[] {
  const countySlug = anchorCountySlug(origin);
  if (!countySlug) {
    return [];
  }

  const originCoords = getCoordinatesForVendor(origin.city, countySlug);

  const candidates = allVendors.filter(
    (v) => v.slug !== origin.slug && vendorServesCounty(v, countySlug)
  );

  function distanceKm(v: Vendor): number {
    const c = getCoordinatesForVendor(v.city, v.county.toLowerCase());
    if (!originCoords || !c) return Number.POSITIVE_INFINITY;
    return haversineKm(originCoords, c);
  }

  candidates.sort((a, b) => {
    const pa = vendorHasListingPricesShown(a);
    const pb = vendorHasListingPricesShown(b);
    if (pa !== pb) return Number(pb) - Number(pa);

    const da = distanceKm(a);
    const db = distanceKm(b);
    if (da !== db) return da - db;

    return a.name.localeCompare(b.name);
  });

  return candidates.slice(0, limit);
}
