-- A2 Defense / A2 Firearms books courses online at https://www.a2defensetraining.com/
-- (Start today / View course / cart). Riverside was unclear.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking at https://www.a2defensetraining.com/ — course catalog with Start today / View course and cart checkout for dated and online CCW classes.',
  updated_at = now()
WHERE website_url ILIKE '%a2defensetraining.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
