-- Update Valley Defensive Solutions initial (16hr) course fee to $300.
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '300',
  updated_at = now()
WHERE website_url ILIKE '%valleydefensivesolutions.com%'
  AND (price_16hr_full IS DISTINCT FROM '300');
