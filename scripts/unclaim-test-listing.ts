/**
 * Reset the INTERNAL claim-funnel test listing so it can be claimed again.
 *
 * Usage:
 *   npx tsx scripts/unclaim-test-listing.ts
 *   npx tsx scripts/unclaim-test-listing.ts --dry-run
 */
import { config } from "dotenv";
import { resolve } from "path";

for (const f of [".env", ".env.local"]) {
  config({ path: resolve(process.cwd(), f), override: true, quiet: true });
}

import { PrismaClient } from "@prisma/client";

const SLUG = "internal-claim-funnel-test-6b7e67a50b";
const dryRun = process.argv.includes("--dry-run");

function poolerSafeUrl(raw: string): string {
  if (!/pooler\.supabase\.com:6543/.test(raw) || /pgbouncer=/.test(raw)) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}pgbouncer=true`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: poolerSafeUrl(process.env.DATABASE_URL ?? "") } },
});

async function main() {
  console.log(dryRun ? "DRY RUN — no writes\n" : "UNCLAIMING test listing\n");
  console.log(`slug: ${SLUG}`);

  const claims = await prisma.$queryRawUnsafe<
    Array<{ id: string; clerk_user_id: string; verified_at: Date | null }>
  >(
    `SELECT id, clerk_user_id, verified_at FROM claim_verifications
     WHERE listing_slug = $1`,
    SLUG
  );
  console.log(`claim_verifications rows: ${claims.length}`);

  const onboarding = await prisma.$queryRawUnsafe<
    Array<{ id: string; clerk_user_id: string | null; is_published: boolean }>
  >(
    `SELECT id, clerk_user_id, is_published FROM vendors WHERE slug = $1`,
    SLUG
  );
  console.log(`onboarding vendors rows: ${onboarding.length}`);

  const bookingVendor = await prisma.vendor.findUnique({
    where: { slug: SLUG },
    select: {
      id: true,
      _count: { select: { classSessions: true, bookings: true } },
    },
  });
  if (bookingVendor) {
    console.log(
      `prisma Vendor: ${bookingVendor.id} (${bookingVendor._count.classSessions} sessions, ${bookingVendor._count.bookings} bookings)`
    );
  } else {
    console.log("prisma Vendor: none");
  }

  // Test listing is hidden + named; no native slug column on carry_class_vendor_data.
  const listingRows = await prisma.$queryRawUnsafe<Array<{ id: string; vendor_name: string }>>(
    `SELECT id::text AS id, vendor_name
     FROM carry_class_vendor_data
     WHERE vendor_name ILIKE $1
     LIMIT 5`,
    "%Claim Funnel%"
  );
  console.log(
    `listing source rows: ${
      listingRows.map((r) => `${r.id} (${r.vendor_name})`).join(", ") || "(none)"
    }`
  );

  if (dryRun) {
    console.log("\nWould delete/reset the above. Re-run without --dry-run to apply.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1) Bookings + sessions + booking Vendor (clean checkout retest)
    if (bookingVendor) {
      await tx.savedVendor.deleteMany({ where: { vendorId: bookingVendor.id } });
      await tx.vendorReview.deleteMany({ where: { vendorId: bookingVendor.id } });
      const bookings = await tx.booking.deleteMany({
        where: { vendorId: bookingVendor.id },
      });
      const sessions = await tx.classSession.deleteMany({
        where: { vendorId: bookingVendor.id },
      });
      await tx.vendor.delete({ where: { id: bookingVendor.id } });
      console.log(
        `deleted prisma: ${bookings.count} bookings, ${sessions.count} sessions, 1 vendor`
      );
    }

    // 2) Listing booking flags (keep the directory row)
    if (listingRows.length > 0) {
      const ids = listingRows.map((r) => r.id);
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      const listing = await tx.$executeRawUnsafe(
        `UPDATE carry_class_vendor_data
         SET accepts_bookings = false,
             stripe_connect_account_id = NULL,
             updated_at = now()
         WHERE id::text IN (${placeholders})`,
        ...ids
      );
      console.log(`listing rows updated: ${listing}`);
    } else {
      console.log("listing rows updated: 0 (no source ids — skipped)");
    }

    // 3) Claim verification markers
    const claimDel = await tx.$executeRawUnsafe(
      `DELETE FROM claim_verifications WHERE listing_slug = $1`,
      SLUG
    );
    console.log(`claim_verifications deleted: ${claimDel}`);

    // 4) Onboarding vendor profile (CASCADE cleans class types / calendar / emails)
    for (const row of onboarding) {
      await tx.$executeRawUnsafe(`DELETE FROM vendors WHERE id = $1::uuid`, row.id);
      console.log(`deleted onboarding vendor ${row.id} (clerk ${row.clerk_user_id})`);
    }
  });

  // Verify
  const leftClaims = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM claim_verifications WHERE listing_slug = $1`,
    SLUG
  );
  const leftOnboard = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM vendors WHERE slug = $1`,
    SLUG
  );
  const leftBooking = await prisma.vendor.findUnique({ where: { slug: SLUG } });

  console.log("\nPost-check:");
  console.log(`  claims left: ${leftClaims.length}`);
  console.log(`  onboarding left: ${leftOnboard.length}`);
  console.log(`  prisma Vendor left: ${leftBooking ? "yes" : "none"}`);
  console.log(
    "\nDone. Sign out/in if needed, then claim INTERNAL / Claim Funnel again."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
