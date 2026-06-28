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
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS counties_served text[] DEFAULT '{}';
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
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  max_students integer,
  price numeric(10,2),
  gun_pricing jsonb,
  is_active boolean DEFAULT true,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Classes & Schedule: per-class location + Add-a-Gun pricing
ALTER TABLE vendor_calendar_classes ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE vendor_calendar_classes ADD COLUMN IF NOT EXISTS gun_pricing jsonb;
ALTER TABLE vendor_calendar_classes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE vendor_calendar_classes ADD COLUMN IF NOT EXISTS range_location text;

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

-- Scheduling + sender controls for reminder/follow-up emails.
--   send_mode: 'relative' (offset from class via send_timing) or 'scheduled' (explicit scheduled_at).
--   scheduled_at: explicit date+time the instructor wants the email to go out (nullable).
--   from_email: instructor-chosen "send from" address (nullable; falls back to a verified default).
-- NOTE: scheduling here is persisted INTENT only — there is no worker/cron yet that
-- queries due templates and sends them. See the Emails tab summary for what is wired.
ALTER TABLE vendor_email_templates ADD COLUMN IF NOT EXISTS send_mode text DEFAULT 'relative';
ALTER TABLE vendor_email_templates ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE vendor_email_templates ADD COLUMN IF NOT EXISTS from_email text;

-- Email events / send log. Powers the Emails-tab metrics summary.
--   status: 'sent' | 'delivered' | 'opened' | 'failed' | 'scheduled'
--   opened_at / delivered tracking require Resend webhooks (NOT wired yet).
CREATE TABLE IF NOT EXISTS vendor_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  template_type text,
  recipient text,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  is_test boolean DEFAULT false,
  resend_id text,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_email_events_vendor_idx
  ON vendor_email_events (vendor_id, status);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_calendar_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_email_events ENABLE ROW LEVEL SECURITY;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendor_email_events' AND policyname = 'vendor_email_events_own'
  ) THEN
    CREATE POLICY vendor_email_events_own ON vendor_email_events
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
