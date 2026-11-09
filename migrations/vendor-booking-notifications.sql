-- Instructor alerts when a student books online.
-- Default on. Empty booking_notification_emails → fall back to vendors.email.
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS booking_notification_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS booking_notification_emails text[];

-- PostgREST caches columns; without this, dashboard saves fail until the API reloads.
NOTIFY pgrst, 'reload schema';
