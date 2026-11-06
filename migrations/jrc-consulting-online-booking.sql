-- JRC Consulting registers CCW students online on Thinkific
-- at https://caccw.jrcconsulting.net/ (San Diego row was inquiry_only).
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking at https://caccw.jrcconsulting.net/ (Thinkific). Students register online for California CCW training and renewal.',
  updated_at = now()
WHERE website_url ILIKE '%jrcconsulting.net%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
