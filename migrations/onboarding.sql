-- ============================================================
-- CarryClass Instructor Onboarding Schema Migration
-- ============================================================

-- Extend the vendors table with onboarding columns
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS clerk_user_id text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS county text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS slug text;

-- Onboarding-specific columns from spec
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gallery_urls text[];
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS badge_tags text[];
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cancellation_policy text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cancellation_hours integer;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cancellation_refund_percent integer;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS calendar_type text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ical_feed_url text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_calendar_id text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS google_refresh_token text;

-- Unique index on clerk_user_id
CREATE UNIQUE INDEX IF NOT EXISTS vendors_clerk_user_id_idx ON vendors (clerk_user_id) WHERE clerk_user_id IS NOT NULL;

-- Class types table
CREATE TABLE IF NOT EXISTS vendor_class_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  class_type text NOT NULL,
  price numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Calendar classes table
CREATE TABLE IF NOT EXISTS vendor_calendar_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  external_event_id text,
  class_type text,
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  max_students integer,
  price numeric(10,2),
  is_active boolean DEFAULT true,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS vendor_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject text,
  body text,
  is_active boolean DEFAULT true,
  send_timing text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_calendar_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_email_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'vendors_own_row'
  ) THEN
    CREATE POLICY vendors_own_row ON vendors
      USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
      WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_class_types' AND policyname = 'vendor_class_types_own'
  ) THEN
    CREATE POLICY vendor_class_types_own ON vendor_class_types
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_calendar_classes' AND policyname = 'vendor_calendar_classes_own'
  ) THEN
    CREATE POLICY vendor_calendar_classes_own ON vendor_calendar_classes
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_email_templates' AND policyname = 'vendor_email_templates_own'
  ) THEN
    CREATE POLICY vendor_email_templates_own ON vendor_email_templates
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
