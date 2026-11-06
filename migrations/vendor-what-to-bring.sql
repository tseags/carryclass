-- Instructor-chosen packing list for the public What To Bring tab.
-- Null means the shared defaults are still in use.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS what_to_bring text[];

-- PostgREST caches columns; without this, onboarding saves fail until the API reloads.
NOTIFY pgrst, 'reload schema';
