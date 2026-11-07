-- Paratus Defense Group sells tickets / carts classes on Square
-- at https://www.paratusdefensegroup.com/ (San Diego row had blank booking_capability).
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking via Square (cart + Get tickets). Site lists dated events including Concealed Carry Permit.',
  updated_at = now()
WHERE website_url ILIKE '%paratusdefensegroup.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
