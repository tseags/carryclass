-- Optional instructor setting: require students to acknowledge that they should
-- complete other CCW application steps before training (shown at booking checkout).
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS require_application_ack boolean NOT NULL DEFAULT false;

-- PostgREST caches columns; without this, onboarding saves fail until the API reloads.
NOTIFY pgrst, 'reload schema';
