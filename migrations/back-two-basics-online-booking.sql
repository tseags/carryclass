-- B2B Training / Back Two Basics books online (Click Here to Register)
-- at https://back-two-basics.com/. Uses USCCA. Riverside was inquiry_only.
UPDATE carry_class_vendor_data
SET
  booking_capability = 'direct_booking',
  confidence_notes = 'Confirmed 2026-11-07: online booking via Click Here to Register on https://back-two-basics.com/. IMPORTANT: Uses USCCA.',
  updated_at = now()
WHERE website_url ILIKE '%back-two-basics.com%'
  AND booking_capability IS DISTINCT FROM 'direct_booking';

-- Ensure earlier USCCA instructors keep the marker in listing notes for the uscca outreach tag.
UPDATE carry_class_vendor_data
SET
  confidence_notes = CASE
    WHEN confidence_notes ILIKE '%USCCA%' THEN confidence_notes
    ELSE coalesce(confidence_notes, '') || ' IMPORTANT: Uses USCCA.'
  END,
  updated_at = now()
WHERE website_url ILIKE '%5150heat.com%'
   OR website_url ILIKE '%azonedefense.com%';
