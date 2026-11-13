-- Instructor-initiated student reschedule (v1): one-time magic links + light audit.
-- Apply via: npm run migrate:sql -- --file migrations/booking-reschedule-tokens.sql

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "rescheduledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "previousClassSessionId" TEXT;

CREATE TABLE IF NOT EXISTS "BookingRescheduleToken" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingRescheduleToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingRescheduleToken_tokenHash_key"
  ON "BookingRescheduleToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "BookingRescheduleToken_bookingId_idx"
  ON "BookingRescheduleToken"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingRescheduleToken_expiresAt_idx"
  ON "BookingRescheduleToken"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BookingRescheduleToken_bookingId_fkey'
  ) THEN
    ALTER TABLE "BookingRescheduleToken"
      ADD CONSTRAINT "BookingRescheduleToken_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
