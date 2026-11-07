-- Alpha Point Firearms Training books online via Square at
-- https://alphapointtraining.com/ (BOOK NOW + cart). Tuolumne was blank.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking at https://alphapointtraining.com/ — Square Online with BOOK NOW and shopping cart.',
  updated_at = now()
WHERE website_url ILIKE '%alphapointtraining.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
