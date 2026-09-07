-- Internal claim-funnel smoke-test listing (hidden from public directory).
-- Safe to re-run: skips insert when the test row already exists.

INSERT INTO carry_class_vendor_data (
  county,
  vendor_name,
  email,
  city,
  state,
  vendor_description,
  crawl_status,
  enrichment_confidence,
  hidden_from_directory,
  enriched_at
)
SELECT
  'alpine',
  'INTERNAL — Claim Funnel Test',
  'matthiasseager@gmail.com',
  'Test City',
  'CA',
  'Internal smoke-test row for the instructor claim funnel — not a real business. Used to verify /instructors/claim without emailing live directory contacts.',
  'success',
  'high',
  true,
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM carry_class_vendor_data
  WHERE vendor_name = 'INTERNAL — Claim Funnel Test'
    AND email = 'matthiasseager@gmail.com'
);
