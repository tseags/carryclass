-- American Academy of Protective Training books via Acuity at
-- https://aapt.acuityscheduling.com/ (linked from https://myaapt.com/).
-- Los Angeles was inquiry_only.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-06: online booking via Acuity Scheduling (https://aapt.acuityscheduling.com/) linked from Training Calendar / Schedule A Course on https://myaapt.com/.',
  updated_at = now()
WHERE website_url ILIKE '%myaapt.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
