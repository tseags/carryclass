-- Phone collected on the booking form, stored with the paid booking.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
