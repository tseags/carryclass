-- Snapshot of instructor pass-through fees charged at checkout.
-- Class tuition and the 6% fee stay on Booking.classAmountCents / serviceFeeCents.
-- Apply to the listings project:
--   npm run migrate:sql -- --file migrations/booking-pass-through-fees.sql --target listings

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "passThroughFees" JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "passThroughCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CheckoutFeeSnapshot" (
  "id" TEXT NOT NULL,
  "classSessionId" TEXT NOT NULL,
  "classAmountCents" INTEGER NOT NULL,
  "serviceFeeCents" INTEGER NOT NULL,
  "passThroughFees" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckoutFeeSnapshot_pkey" PRIMARY KEY ("id")
);
