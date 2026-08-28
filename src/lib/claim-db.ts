/**
 * Server-only claim verification persistence (Prisma / DATABASE_URL).
 * Public listing contacts come from vendors-db; onboarding profile updates
 * still go through onboarding-db (Supabase vendors row).
 */
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/db";
import type { VendorProfile } from "@/lib/onboarding-db";
import {
  getOrCreateVendorProfile,
  getVendorProfile,
  updateVendorProfile,
} from "@/lib/onboarding-db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Vendor } from "@/types";

export type ClaimChannel = "email" | "phone";

export interface ClaimVerificationRow {
  id: string;
  clerk_user_id: string;
  listing_slug: string;
  listing_id: string | null;
  listing_name: string | null;
  channel: ClaimChannel;
  destination_normalized: string;
  destination_masked: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  verified_at: Date | null;
  consumed_at: Date | null;
  created_at: Date;
}

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;

function codePepper(): string {
  return (
    process.env.CLAIM_CODE_PEPPER?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    "carryclass-claim-dev"
  );
}

export function hashClaimCode(code: string): string {
  return createHash("sha256")
    .update(`${codePepper()}:${code.trim()}`)
    .digest("hex");
}

export function generateClaimCode(): string {
  return String(randomInt(100000, 1000000));
}

function mapRow(row: Record<string, unknown>): ClaimVerificationRow {
  return {
    id: String(row.id),
    clerk_user_id: String(row.clerk_user_id),
    listing_slug: String(row.listing_slug),
    listing_id: row.listing_id != null ? String(row.listing_id) : null,
    listing_name: row.listing_name != null ? String(row.listing_name) : null,
    channel: row.channel as ClaimChannel,
    destination_normalized: String(row.destination_normalized),
    destination_masked: String(row.destination_masked),
    code_hash: String(row.code_hash),
    attempts: Number(row.attempts ?? 0),
    max_attempts: Number(row.max_attempts ?? MAX_ATTEMPTS),
    expires_at: new Date(String(row.expires_at)),
    verified_at: row.verified_at ? new Date(String(row.verified_at)) : null,
    consumed_at: row.consumed_at ? new Date(String(row.consumed_at)) : null,
    created_at: new Date(String(row.created_at)),
  };
}

/** True when this Clerk user has completed a claim (slug on profile or verified row). */
export async function userHasClaimedListing(clerkUserId: string): Promise<boolean> {
  const profile = await getVendorProfile(clerkUserId);
  if (profile?.slug?.trim()) return true;

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM claim_verifications
     WHERE clerk_user_id = $1 AND verified_at IS NOT NULL
     LIMIT 1`,
    clerkUserId
  );
  return rows.length > 0;
}

export async function findClaimOwnerBySlug(
  slug: string
): Promise<{ clerk_user_id: string } | null> {
  const verified = await prisma.$queryRawUnsafe<Array<{ clerk_user_id: string }>>(
    `SELECT clerk_user_id FROM claim_verifications
     WHERE listing_slug = $1 AND verified_at IS NOT NULL
     LIMIT 1`,
    slug
  );
  if (verified[0]?.clerk_user_id) {
    return { clerk_user_id: verified[0].clerk_user_id };
  }

  const { data } = await supabaseAdmin()
    .from("vendors")
    .select("clerk_user_id")
    .eq("slug", slug)
    .not("clerk_user_id", "is", null)
    .maybeSingle();

  if (!data?.clerk_user_id) return null;
  return { clerk_user_id: data.clerk_user_id as string };
}

export async function getActiveClaimVerification(
  id: string,
  clerkUserId: string
): Promise<ClaimVerificationRow | null> {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT * FROM claim_verifications
     WHERE id = $1::uuid AND clerk_user_id = $2
     LIMIT 1`,
    id,
    clerkUserId
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function invalidateOpenVerifications(
  clerkUserId: string,
  listingSlug: string,
  channel: ClaimChannel
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE claim_verifications
     SET consumed_at = now()
     WHERE clerk_user_id = $1
       AND listing_slug = $2
       AND channel = $3
       AND verified_at IS NULL
       AND consumed_at IS NULL`,
    clerkUserId,
    listingSlug,
    channel
  );
}

export async function recentStartTooSoon(
  clerkUserId: string,
  listingSlug: string,
  channel: ClaimChannel
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM claim_verifications
     WHERE clerk_user_id = $1
       AND listing_slug = $2
       AND channel = $3
       AND created_at >= now() - ($4::text || ' seconds')::interval
     ORDER BY created_at DESC
     LIMIT 1`,
    clerkUserId,
    listingSlug,
    channel,
    String(RESEND_COOLDOWN_SEC)
  );
  return rows.length > 0;
}

export async function createClaimVerification(input: {
  clerkUserId: string;
  listing: Vendor;
  channel: ClaimChannel;
  destinationNormalized: string;
  destinationMasked: string;
  code: string;
}): Promise<ClaimVerificationRow> {
  await invalidateOpenVerifications(
    input.clerkUserId,
    input.listing.slug,
    input.channel
  );

  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `INSERT INTO claim_verifications (
       clerk_user_id, listing_slug, listing_id, listing_name, channel,
       destination_normalized, destination_masked, code_hash,
       attempts, max_attempts, expires_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8,
       0, $9, $10
     )
     RETURNING *`,
    input.clerkUserId,
    input.listing.slug,
    input.listing.id,
    input.listing.name,
    input.channel,
    input.destinationNormalized,
    input.destinationMasked,
    hashClaimCode(input.code),
    MAX_ATTEMPTS,
    expiresAt
  );

  if (!rows[0]) throw new Error("Failed to create claim verification");
  return mapRow(rows[0]);
}

export type VerifyClaimResult =
  | { ok: true; verification: ClaimVerificationRow }
  | { ok: false; error: string; status: number };

/** Validate the code without consuming it (so attach can run first). */
export async function checkClaimCode(
  verificationId: string,
  clerkUserId: string,
  code: string
): Promise<VerifyClaimResult> {
  const row = await getActiveClaimVerification(verificationId, clerkUserId);
  if (!row) {
    return { ok: false, error: "Verification not found.", status: 404 };
  }
  if (row.verified_at || row.consumed_at) {
    return { ok: false, error: "This code was already used.", status: 400 };
  }
  if (row.expires_at.getTime() < Date.now()) {
    return { ok: false, error: "This code has expired. Request a new one.", status: 400 };
  }
  if (row.attempts >= row.max_attempts) {
    return {
      ok: false,
      error: "Too many attempts. Request a new code.",
      status: 429,
    };
  }

  const match = hashClaimCode(code) === row.code_hash;
  if (!match) {
    const nextAttempts = row.attempts + 1;
    await prisma.$executeRawUnsafe(
      `UPDATE claim_verifications SET attempts = $1 WHERE id = $2::uuid`,
      nextAttempts,
      row.id
    );
    const left = row.max_attempts - nextAttempts;
    return {
      ok: false,
      error:
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many attempts. Request a new code.",
      status: 400,
    };
  }

  return { ok: true, verification: row };
}

export async function markClaimVerified(
  verificationId: string
): Promise<ClaimVerificationRow> {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `UPDATE claim_verifications
     SET verified_at = now(), consumed_at = now()
     WHERE id = $1::uuid
     RETURNING *`,
    verificationId
  );
  if (!rows[0]) throw new Error("Could not confirm verification.");
  return mapRow(rows[0]);
}

/** @deprecated use checkClaimCode + markClaimVerified */
export async function verifyClaimCode(
  verificationId: string,
  clerkUserId: string,
  code: string
): Promise<VerifyClaimResult> {
  const checked = await checkClaimCode(verificationId, clerkUserId, code);
  if (!checked.ok) return checked;
  const verification = await markClaimVerified(checked.verification.id);
  return { ok: true, verification };
}

/**
 * After a successful code check: attach the public listing slug to the
 * onboarding vendor profile (claim-only — never invent a new listing).
 */
export async function attachClaimedListing(input: {
  clerkUserId: string;
  listing: Vendor;
  channel: ClaimChannel;
  userName?: string;
  userEmail?: string;
}): Promise<VendorProfile> {
  const owner = await findClaimOwnerBySlug(input.listing.slug);
  if (owner && owner.clerk_user_id !== input.clerkUserId) {
    throw new Error("This listing has already been claimed.");
  }

  const vendor = await getOrCreateVendorProfile(input.clerkUserId, {
    name: input.userName,
    email: input.userEmail,
  });

  if (vendor.slug && vendor.slug !== input.listing.slug) {
    throw new Error("Your account already claimed a different listing.");
  }

  await updateVendorProfile(vendor.id, {
    slug: input.listing.slug,
    name: input.listing.name,
    canonical_name: input.listing.name,
    email: input.listing.email ?? vendor.email,
    phone: input.listing.phone ?? vendor.phone,
    website: input.listing.website ?? vendor.website,
    address: input.listing.address ?? vendor.address,
    county: input.listing.county || vendor.county,
    counties_served:
      input.listing.countiesServed?.length > 0
        ? input.listing.countiesServed
        : vendor.counties_served,
    bio: vendor.bio || input.listing.description || null,
    photo_url: vendor.photo_url || input.listing.imageUrl || null,
  });

  return getOrCreateVendorProfile(input.clerkUserId);
}
