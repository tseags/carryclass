-- Manual website-booking overrides + booking-tool field for /outreach.
-- Apply: npm run migrate:sql -- --file migrations/outreach-booking-tool.sql --target listings

ALTER TABLE "OutreachContact"
  ADD COLUMN IF NOT EXISTS "bookingCapabilityLocked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OutreachContact"
  ADD COLUMN IF NOT EXISTS "bookingTool" TEXT;

-- Seed bookingTool from notes / USCCA tag already on contacts.
UPDATE "OutreachContact"
SET "bookingTool" = 'uscca'
WHERE "bookingTool" IS NULL
  AND (
    'uscca' = ANY("tags")
    OR EXISTS (
      SELECT 1 FROM "OutreachActivity" a
      WHERE a."contactId" = "OutreachContact"."id"
        AND a.type = 'note'
        AND a.body ILIKE '%USCCA%'
    )
  );

UPDATE "OutreachContact"
SET "bookingTool" = 'shootingclasses'
WHERE "bookingTool" IS NULL
  AND EXISTS (
    SELECT 1 FROM "OutreachActivity" a
    WHERE a."contactId" = "OutreachContact"."id"
      AND a.type = 'note'
      AND a.body ILIKE '%ShootingClasses%'
  );

UPDATE "OutreachContact"
SET "bookingTool" = 'onsite_checkout'
WHERE "bookingTool" IS NULL
  AND EXISTS (
    SELECT 1 FROM "OutreachActivity" a
    WHERE a."contactId" = "OutreachContact"."id"
      AND a.type = 'note'
      AND (
        a.body ILIKE '%WooCommerce%'
        OR a.body ILIKE '%Square%'
        OR a.body ILIKE '%Add to cart%'
        OR a.body ILIKE '%Onsite checkout%'
        OR a.body ILIKE '%their own online booking%'
      )
  );
