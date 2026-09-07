-- Correct Safe Insight initial (16hr) course fee: was $99 on several county rows.
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '400',
  updated_at = now()
WHERE vendor_name ILIKE '%Safe Insight%'
  AND (price_16hr_full IS DISTINCT FROM '400');
