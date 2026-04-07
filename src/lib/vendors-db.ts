import type { Vendor } from "@/types";
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

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const row = await prisma.vendor.findUnique({ where: { slug } });
  return row ? toVendor(row) : null;
}

export async function getAllVendors(): Promise<Vendor[]> {
  const rows = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  return rows.map(toVendor);
}

/**
 * Vendor count per county slug, from each vendor's `countiesServed`.
 * A vendor listed in multiple counties is counted once per county.
 */
export async function getVendorCountsByCounty(): Promise<Record<string, number>> {
  const rows = await prisma.vendor.findMany({
    select: { countiesServed: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const raw of row.countiesServed) {
      const slug = raw.toLowerCase();
      counts[slug] = (counts[slug] ?? 0) + 1;
    }
  }
  return counts;
}

export async function getVendorsByCounty(countySlug: string): Promise<Vendor[]> {
  const slug = countySlug.toLowerCase();
  const rows = await prisma.vendor.findMany({
    where: {
      countiesServed: { has: slug },
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toVendor);
}

export async function getVendorsByCity(
  city: string,
  countySlug?: string
): Promise<Vendor[]> {
  const cityLower = city.toLowerCase();
  const rows = await prisma.vendor.findMany({
    where: {
      city: { equals: city, mode: "insensitive" },
      ...(countySlug && {
        countiesServed: { has: countySlug.toLowerCase() },
      }),
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toVendor);
}

export async function getUniqueCitiesInCounty(countySlug: string): Promise<string[]> {
  const vendors = await getVendorsByCounty(countySlug);
  const cities = [...new Set(vendors.map((v) => v.city))].sort();
  return cities;
}

export async function getAllUniqueCities(): Promise<string[]> {
  const rows = await prisma.vendor.findMany({
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city);
}
