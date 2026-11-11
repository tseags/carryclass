-- Optional per-county address / phone / email overrides for multi-county instructors.
-- Shape: { "<county-slug>": { "address"?: string, "phone"?: string, "email"?: string } }
-- Empty / missing keys inherit the primary profile contact fields.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS county_contacts jsonb;

-- PostgREST caches columns; without this, onboarding saves fail until the API reloads.
NOTIFY pgrst, 'reload schema';
