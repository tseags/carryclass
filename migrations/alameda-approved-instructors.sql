-- ACSO-approved outside instructors for Alameda County (no dedicated sheriff list).
-- Safe to re-run: skips inserts when an alameda row already exists for the vendor website.

-- Paladin Tactical US pricing (all Paladin Tactical rows)
UPDATE carry_class_vendor_data
SET
  price_16hr_full = '550',
  price_8hr_renewal = '275',
  price_add_a_gun = '100',
  vendor_description = 'Paladin Tactical is a Bay Area firearms training provider that offers CCW classes along with advanced pistol, rifle, shotgun, and scenario-based training. They serve responsible citizens, law enforcement, and security professionals, conducting training at the United Sportsmen range in Concord, CA. Their 16-hour initial CCW course is $550. Their 8-hour course ($275) covers California state-mandated material: self-defense law, firearm safety and fundamentals, safe storage, legal carry requirements, mental health, and a live-fire qualification — with no extra charge for qualifying up to 3 pistols. Permit modifications are $100.',
  enrichment_confidence = 'high',
  confidence_notes = 'Manual pricing update: 16hr $550, 8hr $275 (includes qual for up to 3 pistols), modification $100.',
  updated_at = now()
WHERE vendor_name ILIKE '%Paladin Tactical%';

-- Alameda county listings (cloned from contra-costa source rows)
INSERT INTO carry_class_vendor_data (
  county,
  vendor_name,
  instructor_names,
  email,
  phone,
  website_url,
  booking_capability,
  city,
  state,
  address,
  price_16hr_full,
  price_8hr_renewal,
  price_add_a_gun,
  vendor_description,
  crawl_status,
  enrichment_confidence,
  confidence_notes,
  enriched_at
)
SELECT
  'alameda',
  src.vendor_name,
  src.instructor_names,
  COALESCE(
    src.email,
    CASE WHEN src.vendor_name ILIKE '%Bay Area Tactical%' THEN 'batinstructors@gmail.com' END
  ),
  src.phone,
  src.website_url,
  src.booking_capability,
  CASE
    WHEN src.vendor_name ILIKE '%LEO Defensive%' THEN 'Livermore'
    ELSE src.city
  END,
  src.state,
  src.address,
  src.price_16hr_full,
  src.price_8hr_renewal,
  src.price_add_a_gun,
  CASE
    WHEN src.vendor_name ILIKE '%Paladin Tactical%' THEN
      src.vendor_description || ' Approved for Alameda County Sheriff''s Office (ACSO) CCW training.'
    WHEN src.vendor_name ILIKE '%Bay Area Tactical%' THEN
      regexp_replace(src.vendor_description, '\.$', '') || '. Approved for Alameda County Sheriff''s Office (ACSO) CCW training.'
    ELSE src.vendor_description
  END,
  'success',
  'high',
  'Manually added Alameda County listing — ACSO-approved outside instructor.',
  now()
FROM carry_class_vendor_data src
WHERE src.county = 'contra-costa'
  AND (
    src.vendor_name ILIKE '%Paladin Tactical%'
    OR src.vendor_name ILIKE '%Bay Area Tactical%'
    OR src.vendor_name = 'Gun Kraft'
    OR src.vendor_name ILIKE '%LEO Defensive%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM carry_class_vendor_data existing
    WHERE existing.county = 'alameda'
      AND existing.website_url = src.website_url
  );
