-- Correct MV Tactical & Firearms Training pricing.
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '700',
  price_8hr_renewal = '500',
  updated_at = now()
WHERE website_url ILIKE '%mvtactical-firearmstraining.com%';
