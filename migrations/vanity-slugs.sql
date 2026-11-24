-- Vanity short links for instructor profiles (e.g. /mcbride → /instructors/<profile_slug>).
-- carry_class_vendor_data has no native listing slug column (slugs are computed in app code),
-- so profile_slug stores the canonical /instructors/[slug] segment for redirect lookups.
--
-- Apply against the listings DB only (do not run against production from this agent):
--   npm run check:vendor-db-env
--   npm run migrate:sql -- --file migrations/vanity-slugs.sql --target listings

ALTER TABLE carry_class_vendor_data
  ADD COLUMN IF NOT EXISTS vanity_slug text;

ALTER TABLE carry_class_vendor_data
  ADD COLUMN IF NOT EXISTS profile_slug text;

-- Drop/recreate checks so re-runs stay idempotent.
ALTER TABLE carry_class_vendor_data
  DROP CONSTRAINT IF EXISTS carry_class_vendor_data_vanity_slug_format_chk;

ALTER TABLE carry_class_vendor_data
  ADD CONSTRAINT carry_class_vendor_data_vanity_slug_format_chk
  CHECK (
    vanity_slug IS NULL
    OR (
      vanity_slug = lower(vanity_slug)
      AND char_length(vanity_slug) BETWEEN 3 AND 30
      AND vanity_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    )
  );

ALTER TABLE carry_class_vendor_data
  DROP CONSTRAINT IF EXISTS carry_class_vendor_data_vanity_requires_profile_slug_chk;

ALTER TABLE carry_class_vendor_data
  ADD CONSTRAINT carry_class_vendor_data_vanity_requires_profile_slug_chk
  CHECK (vanity_slug IS NULL OR profile_slug IS NOT NULL);

-- UNIQUE constraint + case-insensitive unique index (store lowercase only).
ALTER TABLE carry_class_vendor_data
  DROP CONSTRAINT IF EXISTS carry_class_vendor_data_vanity_slug_key;

ALTER TABLE carry_class_vendor_data
  ADD CONSTRAINT carry_class_vendor_data_vanity_slug_key UNIQUE (vanity_slug);

CREATE UNIQUE INDEX IF NOT EXISTS carry_class_vendor_data_vanity_slug_lower_uidx
  ON carry_class_vendor_data (lower(vanity_slug))
  WHERE vanity_slug IS NOT NULL;

-- Seed John McBride (San Diego listing).
UPDATE carry_class_vendor_data
SET
  vanity_slug = 'mcbride',
  profile_slug = 'mcbride-s-firearms-safety-proficiency-training-8725d15669'
WHERE vendor_name ILIKE '%McBride%'
  AND (
    county ILIKE 'san-diego'
    OR county ILIKE 'san diego'
  )
  AND (
    vanity_slug IS DISTINCT FROM 'mcbride'
    OR profile_slug IS DISTINCT FROM 'mcbride-s-firearms-safety-proficiency-training-8725d15669'
  );

NOTIFY pgrst, 'reload schema';
