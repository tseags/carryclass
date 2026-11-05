-- Human-friendly booking number (e.g. CC-7K2M9Q) shown on the success page,
-- confirmation email, and instructor dashboard. Backfills existing bookings.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "confirmationCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_confirmationCode_key" ON "Booking"("confirmationCode");

DO $$
DECLARE
  r RECORD;
  code TEXT;
  alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
BEGIN
  FOR r IN SELECT id FROM "Booking" WHERE "confirmationCode" IS NULL LOOP
    LOOP
      code := 'CC-';
      FOR i IN 1..6 LOOP
        code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Booking" WHERE "confirmationCode" = code);
    END LOOP;
    UPDATE "Booking" SET "confirmationCode" = code WHERE id = r.id;
  END LOOP;
END $$;
