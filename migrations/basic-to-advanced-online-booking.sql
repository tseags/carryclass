-- Basic to Advanced Firearms Training books via ShootingClasses.com
-- (Book Now → https://www.shootingclasses.com/basic-to-advanced-firearms-training-llc/).
-- Placer was inquiry_only.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-07: online booking through ShootingClasses.com (Book Now on https://www.firearms-training.net/courses → https://www.shootingclasses.com/basic-to-advanced-firearms-training-llc/).',
  updated_at = now()
WHERE website_url ILIKE '%firearms-training.net%'
  AND vendor_name ILIKE '%Basic to Advanced%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';
