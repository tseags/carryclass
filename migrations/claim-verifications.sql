-- ============================================================
-- Instructor listing claim verification
-- Codes are sent ONLY to email/phone already on the directory listing.
-- Stored on DATABASE_URL (same Postgres as public vendor listings).
-- Onboarding vendors.slug (Supabase) is set after a successful verify.
-- ============================================================

CREATE TABLE IF NOT EXISTS claim_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  listing_slug text NOT NULL,
  listing_id text,
  listing_name text,
  channel text NOT NULL CHECK (channel IN ('email', 'phone')),
  -- Normalized destination taken from the listing row only (never user-supplied).
  destination_normalized text NOT NULL,
  destination_masked text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_verifications_clerk_idx
  ON claim_verifications (clerk_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS claim_verifications_listing_idx
  ON claim_verifications (listing_slug, created_at DESC);

-- Successful claim marker: one verified row per listing slug
CREATE UNIQUE INDEX IF NOT EXISTS claim_verifications_listing_claimed_uidx
  ON claim_verifications (listing_slug)
  WHERE verified_at IS NOT NULL;
