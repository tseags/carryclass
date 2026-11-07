-- Azone Defense books classes online (Sign Up / Square cart) at
-- https://azonedefense.com/. USCCA Certified Instructor — important for outreach.
-- Riverside was unclear.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-07: online booking via Sign Up / Square cart on https://azonedefense.com/. IMPORTANT: Uses USCCA — site shows USCCA Certified Instructor (Concealed Carry & Home Defense Fundamentals); USCCA instructor profile and USCCA student reviews.',
  updated_at = now()
WHERE website_url ILIKE '%azonedefense.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
