-- Enable Book Now + Stripe Connect on public directory rows after instructor publish.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE carry_class_vendor_data
  ADD COLUMN IF NOT EXISTS accepts_bookings BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE carry_class_vendor_data
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
