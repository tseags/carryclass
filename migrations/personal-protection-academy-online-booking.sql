-- Personal Protection Academy books online at https://www.the-ppa.com/
-- (Book Private Lesson + Training Calendar). Riverside/San Diego were inquiry_only.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking at https://www.the-ppa.com/ — Book Private Lesson CTA and Training Calendar for dated classes.',
  updated_at = now()
WHERE website_url ILIKE '%the-ppa.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
