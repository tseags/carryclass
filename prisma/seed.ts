import { PrismaClient } from "@prisma/client";
import { VENDORS } from "../src/data/vendors";

const prisma = new PrismaClient();

function toDbVendor(v: (typeof VENDORS)[number]) {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    type: v.type,
    city: v.city,
    county: v.county,
    state: v.state,
    countiesServed: v.countiesServed,
    classTypes: v.classTypes,
    formats: v.formats,
    priceMin: v.priceMin ?? null,
    priceMax: v.priceMax ?? null,
    priceInitial: v.priceInitial ?? null,
    priceRenewal: v.priceRenewal ?? null,
    priceAddGun: v.priceAddGun ?? null,
    address: v.address ?? null,
    discountInfo: v.discountInfo ?? null,
    website: v.website ?? null,
    phone: v.phone ?? null,
    email: v.email ?? null,
    description: v.description ?? null,
    imageUrl: v.imageUrl ?? null,
    photos: v.photos ?? [],
    googleReviewsUrl: v.googleReviewsUrl ?? null,
    googlePlaceId: v.googlePlaceId ?? null,
    featured: v.featured ?? false,
    createdAt: new Date(v.createdAt),
  };
}

async function main() {
  console.log("Seeding vendors...");
  for (const v of VENDORS) {
    const data = toDbVendor(v);
    await prisma.vendor.upsert({
      where: { slug: v.slug },
      create: data,
      update: data,
    });
  }
  console.log(`Seeded ${VENDORS.length} vendors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
