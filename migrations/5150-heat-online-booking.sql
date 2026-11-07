-- 5150 HEAT books dated CCW courses online at https://www.5150heat.com/
-- (Book Your Course / Pick a Date). Orange County was inquiry_only.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking at https://www.5150heat.com/ — Book Your Course / Pick a Date & Book. Uses USCCA curriculum (USCCA Basic Firearms Fundamentals, USCCA-certified instructors).',
  updated_at = now()
WHERE website_url ILIKE '%5150heat.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
