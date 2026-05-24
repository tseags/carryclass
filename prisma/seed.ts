import { PrismaClient } from "@prisma/client";
import { VENDORS } from "../src/data/vendors";
import {
  DEMO_BOOKING_VENDOR_SLUG,
  DEMO_CLASS_SESSIONS,
  toDbVendor,
  upsertDemoClassSessions,
} from "../src/lib/demo-booking-seed-shared";

const prisma = new PrismaClient();

async function main() {
  const connectFromEnv = process.env.DEMO_VENDOR_STRIPE_CONNECT_ACCOUNT_ID?.trim();

  console.log("Seeding vendors...");
  for (const v of VENDORS) {
    const data = toDbVendor(v);

    if (v.slug === DEMO_BOOKING_VENDOR_SLUG) {
      const createData = {
        ...data,
        stripeConnectAccountId: connectFromEnv ?? data.stripeConnectAccountId,
      };
      const { stripeConnectAccountId: _sc, ...updateBase } = data;
      const updateData = connectFromEnv
        ? { ...updateBase, stripeConnectAccountId: connectFromEnv }
        : updateBase;

      await prisma.vendor.upsert({
        where: { slug: v.slug },
        create: createData,
        update: updateData,
      });
    } else {
      await prisma.vendor.upsert({
        where: { slug: v.slug },
        create: data,
        update: data,
      });
    }
  }
  console.log(`Seeded ${VENDORS.length} vendors.`);

  const demoVendor = await prisma.vendor.findUnique({
    where: { slug: DEMO_BOOKING_VENDOR_SLUG },
  });
  if (!demoVendor) {
    console.warn(`Demo vendor slug ${DEMO_BOOKING_VENDOR_SLUG} not found; skip class session.`);
    return;
  }

  await upsertDemoClassSessions(prisma, demoVendor.id);
  console.log(
    `Upserted ${DEMO_CLASS_SESSIONS.length} demo ClassSessions for /instructors/${DEMO_BOOKING_VENDOR_SLUG}/book`
  );
  if (!demoVendor.stripeConnectAccountId) {
    console.log(
      "Optional: set DEMO_VENDOR_STRIPE_CONNECT_ACCOUNT_ID (test acct_...) and re-run seed, or set Vendor.stripeConnectAccountId in the DB to test Checkout."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
