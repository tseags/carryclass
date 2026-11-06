-- Force Defensive Firearms Training sells dated CCW classes on their own site
-- (WooCommerce "Add to cart" at https://forcedefensivefirearmstraining.com/).
-- Riverside was inquiry_only; San Diego was unclear.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking via WooCommerce Add to cart. Dated classes include 16hr initial $330 and 8hr renewal $230.',
  updated_at = now()
WHERE website_url ILIKE '%forcedefensivefirearmstraining.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
