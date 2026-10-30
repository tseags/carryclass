-- Other classes (display name + description on vendor_class_types)
-- and instructor pass-through checkout fees.
-- Apply to the onboarding project:
--   npm run migrate:sql -- --file migrations/custom-classes-and-fees.sql --target onboarding

ALTER TABLE vendor_class_types ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE vendor_class_types ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE vendor_class_types ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS vendor_class_types_vendor_type_idx
  ON vendor_class_types (vendor_id, class_type);

CREATE TABLE IF NOT EXISTS vendor_checkout_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  note text,
  applies_to_all boolean NOT NULL DEFAULT true,
  class_types text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_checkout_fees_vendor_idx
  ON vendor_checkout_fees (vendor_id, sort_order);

ALTER TABLE vendor_checkout_fees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_checkout_fees' AND policyname = 'vendor_checkout_fees_own'
  ) THEN
    CREATE POLICY vendor_checkout_fees_own ON vendor_checkout_fees
      USING (vendor_id IN (
        SELECT id FROM vendors
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      ))
      WITH CHECK (vendor_id IN (
        SELECT id FROM vendors
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      ));
  END IF;
END$$;
