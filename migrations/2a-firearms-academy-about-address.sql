-- Shorten 2A Firearms Academy about copy and set training address.
-- Safe to re-run: only touches rows that still need the change.

UPDATE carry_class_vendor_data
SET
  vendor_description = '2A Firearms Academy provides California DOJ-certified CCW training across the Bay Area, founded by U.S. Army veteran Doug Kevilus and co-founder Ryan Lewis. Classes cover state-mandated legal curriculum and live-fire qualification at United Sportsmen in Concord. The academy is an approved training provider for the Marin County Sheriff''s Office.',
  city = 'Concord',
  state = 'CA',
  address = 'United Sportsmen 4700 Evora Road, Concord, United States',
  enrichment_confidence = 'high',
  confidence_notes = 'Manual update: shortened about copy; training address set to United Sportsmen, Concord.',
  updated_at = now()
WHERE (
    vendor_name ILIKE '%2nd Amendment Firearms%'
    OR vendor_name ILIKE '%2A Firearms Academy%'
    OR website_url ILIKE '%2afirearmsacademy.com%'
  )
  AND (
    vendor_description IS DISTINCT FROM '2A Firearms Academy provides California DOJ-certified CCW training across the Bay Area, founded by U.S. Army veteran Doug Kevilus and co-founder Ryan Lewis. Classes cover state-mandated legal curriculum and live-fire qualification at United Sportsmen in Concord. The academy is an approved training provider for the Marin County Sheriff''s Office.'
    OR city IS DISTINCT FROM 'Concord'
    OR address IS DISTINCT FROM 'United Sportsmen 4700 Evora Road, Concord, United States'
  );
