-- Set North County Shooting Center initial and renewal course fees.
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '499',
  price_8hr_renewal = '275',
  updated_at = now()
WHERE (
    vendor_name ILIKE 'North County Shooting Center'
    OR website_url ILIKE '%northcountyshootingcenter.com%'
  )
  AND (
    price_16hr_full IS DISTINCT FROM '499'
    OR price_8hr_renewal IS DISTINCT FROM '275'
  );
