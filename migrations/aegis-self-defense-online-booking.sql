-- Aegis Self Defense books upcoming CCW classes online at https://aegissd.com/
-- (cart + Bookings). Placer was inquiry_only.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking at https://aegissd.com/ — shopping cart and Bookings for upcoming initial/renewal CCW classes listed on the page.',
  updated_at = now()
WHERE website_url ILIKE '%aegissd.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
