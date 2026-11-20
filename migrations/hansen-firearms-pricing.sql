-- Update Hansen Firearms Training course fees (initial $350 / renewal $300).
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '350',
  price_8hr_renewal = '300',
  updated_at = now()
WHERE vendor_name ILIKE '%Hansen Firearms%'
  AND (
    price_16hr_full IS DISTINCT FROM '350'
    OR price_8hr_renewal IS DISTINCT FROM '300'
  );
