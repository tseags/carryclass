/**
 * Create/repair the `vendor-assets` Supabase Storage bucket used by
 * /api/upload-vendor-asset for instructor profile photos and gallery images.
 *
 * Lives on the REST project (NEXT_PUBLIC_SUPABASE_URL) because the upload route
 * goes through supabaseAdmin(), not DATABASE_URL. Idempotent.
 *
 * Object keys are `{vendorId}/profile.{ext}` and `{vendorId}/gallery/{ts}.{ext}`
 * inside this bucket.
 *
 * Usage: npm run ensure:vendor-assets-bucket
 */

import { config } from "dotenv";
import { resolve } from "node:path";

for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

const BUCKET = "vendor-assets";
/** Mirrors the limits enforced in src/app/api/upload-vendor-asset/route.ts. */
const FILE_SIZE_LIMIT = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

interface BucketRecord {
  id: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

async function main(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  if (!serviceKey) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is required to manage buckets (anon key cannot create them)."
    );
    process.exitCode = 1;
    return;
  }

  const ref = new URL(baseUrl).hostname.split(".")[0];
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  console.log(`Storage bucket "${BUCKET}" on Supabase project ${ref}`);
  console.log("─".repeat(50));

  const existing = await fetch(`${baseUrl}/storage/v1/bucket/${BUCKET}`, { headers });

  if (existing.status === 404 || existing.status === 400) {
    const created = await fetch(`${baseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: BUCKET,
        name: BUCKET,
        public: true,
        file_size_limit: FILE_SIZE_LIMIT,
        allowed_mime_types: ALLOWED_MIME_TYPES,
      }),
    });

    if (!created.ok) {
      console.error(`Create failed: ${created.status} ${await created.text()}`);
      process.exitCode = 1;
      return;
    }
    console.log("✓ Created bucket (public, 5MB limit, image/jpeg + image/png).");
    console.log("  Public reads need no policy; uploads use the service role key.");
    return;
  }

  if (!existing.ok) {
    console.error(`Lookup failed: ${existing.status} ${await existing.text()}`);
    process.exitCode = 1;
    return;
  }

  const bucket = (await existing.json()) as BucketRecord;
  console.log("Bucket already exists:", {
    public: bucket.public,
    file_size_limit: bucket.file_size_limit,
    allowed_mime_types: bucket.allowed_mime_types,
  });

  const needsUpdate =
    !bucket.public ||
    bucket.file_size_limit !== FILE_SIZE_LIMIT ||
    ALLOWED_MIME_TYPES.some((m) => !(bucket.allowed_mime_types ?? []).includes(m));

  if (!needsUpdate) {
    console.log("✓ Configuration already correct — nothing to do.");
    return;
  }

  const updated = await fetch(`${baseUrl}/storage/v1/bucket/${BUCKET}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      public: true,
      file_size_limit: FILE_SIZE_LIMIT,
      allowed_mime_types: ALLOWED_MIME_TYPES,
    }),
  });

  if (!updated.ok) {
    console.error(`Update failed: ${updated.status} ${await updated.text()}`);
    process.exitCode = 1;
    return;
  }
  console.log("✓ Updated bucket to public with the 5MB / JPG+PNG limits.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
