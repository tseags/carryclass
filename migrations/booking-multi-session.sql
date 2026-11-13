-- Multi-session bookings (Initial two-day + cart) and optional Day 1/Day 2 labels.
-- Apply via:
--   npm run migrate:sql -- --file migrations/booking-multi-session.sql --target listings
-- (Also apply vendor_calendar_classes.day_index on the onboarding/Supabase project.)

ALTER TABLE "ClassSession"
  ADD COLUMN IF NOT EXISTS "dayIndex" INTEGER;

CREATE TABLE IF NOT EXISTS "BookingSession" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "classSessionId" TEXT NOT NULL,
  CONSTRAINT "BookingSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingSession_bookingId_classSessionId_key"
  ON "BookingSession"("bookingId", "classSessionId");

CREATE INDEX IF NOT EXISTS "BookingSession_classSessionId_idx"
  ON "BookingSession"("classSessionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookingSession_bookingId_fkey'
  ) THEN
    ALTER TABLE "BookingSession"
      ADD CONSTRAINT "BookingSession_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookingSession_classSessionId_fkey'
  ) THEN
    ALTER TABLE "BookingSession"
      ADD CONSTRAINT "BookingSession_classSessionId_fkey"
      FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Onboarding calendar source of truth (Supabase vendors project).
ALTER TABLE vendor_calendar_classes
  ADD COLUMN IF NOT EXISTS day_index integer;

NOTIFY pgrst, 'reload schema';
