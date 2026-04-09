import type { Vendor } from "@/types";
import { VENDORS } from "@/data/vendors";
import { prisma } from "./db";

function toVendor(row: {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  county: string;
  state: string;
  countiesServed: string[];
  classTypes: string[];
  formats: string[];
  priceMin: number | null;
  priceMax: number | null;
  priceInitial: number | null;
  priceRenewal: number | null;
  priceAddGun: number | null;
  address: string | null;
  discountInfo: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  imageUrl: string | null;
  photos: string[];
  googleReviewsUrl: string | null;
  googlePlaceId: string | null;
  featured: boolean;
  acceptsBookings: boolean;
  createdAt: Date;
}): Vendor {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type as "instructor" | "company",
    city: row.city,
    county: row.county,
    state: row.state,
    countiesServed: row.countiesServed,
    classTypes: row.classTypes as Vendor["classTypes"],
    formats: row.formats as Vendor["formats"],
    priceMin: row.priceMin ?? undefined,
    priceMax: row.priceMax ?? undefined,
    priceInitial: row.priceInitial ?? undefined,
    priceRenewal: row.priceRenewal ?? undefined,
    priceAddGun: row.priceAddGun ?? undefined,
    address: row.address ?? undefined,
    discountInfo: row.discountInfo ?? undefined,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    photos: row.photos?.length ? row.photos : undefined,
    googleReviewsUrl: row.googleReviewsUrl ?? undefined,
    googlePlaceId: row.googlePlaceId ?? undefined,
    featured: row.featured,
    acceptsBookings: row.acceptsBookings,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

function sortByName(vendors: Vendor[]): Vendor[] {
  return [...vendors].sort((a, b) => a.name.localeCompare(b.name));
}

/** Seed rows in DB take precedence; static entries fill in any slug not present (e.g. demo before migrate/seed). */
function staticVendorsMissingFromDb(dbSlugs: Set<string>): Vendor[] {
  return VENDORS.filter((v) => !dbSlugs.has(v.slug));
}

function mergeWithStatic(dbVendors: Vendor[]): Vendor[] {
  const dbSlugs = new Set(dbVendors.map((v) => v.slug));
  return sortByName([...dbVendors, ...staticVendorsMissingFromDb(dbSlugs)]);
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  try {
    const row = await prisma.vendor.findUnique({ where: { slug } });
    if (row) return toVendor(row);
  } catch (e) {
    console.error("[vendors-db] getVendorBySlug", e);
  }
  return VENDORS.find((v) => v.slug === slug) ?? null;
}

export async function getAllVendors(): Promise<Vendor[]> {
  try {
    const rows = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
    return mergeWithStatic(rows.map(toVendor));
  } catch (e) {
    console.error("[vendors-db] getAllVendors", e);
    return sortByName([...VENDORS]);
  }
}

/**
 * Vendor count per county slug, from each vendor's `countiesServed`.
 * A vendor listed in multiple counties is counted once per county.
 */
export async function getVendorCountsByCounty(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  let dbSlugs = new Set<string>();

  try {
    const rows = await prisma.vendor.findMany({
      select: { slug: true, countiesServed: true },
    });
    dbSlugs = new Set(rows.map((r) => r.slug));
    for (const row of rows) {
      for (const raw of row.countiesServed) {
        const s = raw.toLowerCase();
        counts[s] = (counts[s] ?? 0) + 1;
      }
    }
  } catch (e) {
    console.error("[vendors-db] getVendorCountsByCounty", e);
    dbSlugs = new Set();
  }

  for (const v of staticVendorsMissingFromDb(dbSlugs)) {
    for (const raw of v.countiesServed) {
      const s = raw.toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }

  return counts;
}

export async function getVendorsByCounty(countySlug: string): Promise<Vendor[]> {
  const slug = countySlug.toLowerCase();
  try {
    const rows = await prisma.vendor.findMany({
      where: {
        countiesServed: { has: slug },
      },
      orderBy: { name: "asc" },
    });
    const dbVendors = rows.map(toVendor);
    const dbSlugs = new Set(dbVendors.map((v) => v.slug));
    const extra = staticVendorsMissingFromDb(dbSlugs).filter((v) =>
      v.countiesServed.some((c) => c.toLowerCase() === slug)
    );
    return sortByName([...dbVendors, ...extra]);
  } catch (e) {
    console.error("[vendors-db] getVendorsByCounty", e);
    return sortByName(
      VENDORS.filter((v) => v.countiesServed.some((c) => c.toLowerCase() === slug))
    );
  }
}

export async function getVendorsByCity(
  city: string,
  countySlug?: string
): Promise<Vendor[]> {
  const cityLower = city.toLowerCase();
  try {
    const rows = await prisma.vendor.findMany({
      where: {
        city: { equals: city, mode: "insensitive" },
        ...(countySlug && {
          countiesServed: { has: countySlug.toLowerCase() },
        }),
      },
      orderBy: { name: "asc" },
    });
    const dbVendors = rows.map(toVendor);
    const dbSlugs = new Set(dbVendors.map((v) => v.slug));
    const extra = staticVendorsMissingFromDb(dbSlugs).filter((v) => {
      const cityMatch = v.city.toLowerCase() === cityLower;
      if (!cityMatch) return false;
      if (!countySlug) return true;
      return v.countiesServed.some((c) => c.toLowerCase() === countySlug.toLowerCase());
    });
    return sortByName([...dbVendors, ...extra]);
  } catch (e) {
    console.error("[vendors-db] getVendorsByCity", e);
    return sortByName(
      VENDORS.filter((v) => {
        const cityMatch = v.city.toLowerCase() === cityLower;
        if (!cityMatch) return false;
        if (!countySlug) return true;
        return v.countiesServed.some((c) => c.toLowerCase() === countySlug.toLowerCase());
      })
    );
  }
}

export async function getUniqueCitiesInCounty(countySlug: string): Promise<string[]> {
  const vendors = await getVendorsByCounty(countySlug);
  const cities = [...new Set(vendors.map((v) => v.city))].sort();
  return cities;
}

export async function getAllUniqueCities(): Promise<string[]> {
  try {
    const rows = await prisma.vendor.findMany({
      select: { slug: true, city: true },
    });
    const dbSlugs = new Set(rows.map((r) => r.slug));
    const dbCities = rows.map((r) => r.city);
    const staticCities = staticVendorsMissingFromDb(dbSlugs).map((v) => v.city);
    return [...new Set([...dbCities, ...staticCities])].sort();
  } catch (e) {
    console.error("[vendors-db] getAllUniqueCities", e);
    return [...new Set(VENDORS.map((v) => v.city))].sort();
  }
}
