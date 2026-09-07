-- Hide specific vendor rows from the public directory while keeping them claimable.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE carry_class_vendor_data
  ADD COLUMN IF NOT EXISTS hidden_from_directory BOOLEAN NOT NULL DEFAULT false;
