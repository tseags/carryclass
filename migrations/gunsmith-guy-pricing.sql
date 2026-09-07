-- Correct The Gunsmith Guy pricing.
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '300',
  price_8hr_renewal = '250',
  updated_at = now()
WHERE website_url ILIKE '%thegunsmithguy.com%';
