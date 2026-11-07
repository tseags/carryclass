-- Internal outreach CRM (/outreach). New tables only; listing tables are read, never written.
-- Apply: npm run migrate:sql -- --file migrations/outreach-crm.sql --target listings

DO $$ BEGIN
  CREATE TYPE "OutreachStage" AS ENUM (
    'not_contacted', 'called', 'called_no_answer', 'emailed', 'follow_up', 'replied',
    'interested', 'not_interested', 'claimed', 'do_not_contact'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OutreachActivityType" AS ENUM ('note', 'stage_change', 'email', 'call');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OutreachCallDisposition" AS ENUM ('no_answer', 'voicemail', 'connected', 'bad_number');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OutreachContact" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "instructorNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "emails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "phones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "website" TEXT,
  "addresses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "city" TEXT,
  "counties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "primaryCounty" TEXT,
  "bookingCapability" TEXT,
  "directorySlug" TEXT,
  "sourceListingIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "stage" "OutreachStage" NOT NULL DEFAULT 'not_contacted',
  "nextActionAt" TIMESTAMP(3),
  "lastContactedAt" TIMESTAMP(3),
  "doNotContact" BOOLEAN NOT NULL DEFAULT false,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutreachContact_dedupeKey_key" ON "OutreachContact"("dedupeKey");
CREATE INDEX IF NOT EXISTS "OutreachContact_stage_idx" ON "OutreachContact"("stage");
CREATE INDEX IF NOT EXISTS "OutreachContact_nextActionAt_idx" ON "OutreachContact"("nextActionAt");

CREATE TABLE IF NOT EXISTS "OutreachActivity" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "type" "OutreachActivityType" NOT NULL,
  "body" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fromStage" "OutreachStage",
  "toStage" "OutreachStage",
  "disposition" "OutreachCallDisposition",
  "durationSeconds" INTEGER,
  "phone" TEXT,
  "zohoMessageId" TEXT,
  "twilioCallSid" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutreachActivity_contactId_fkey" FOREIGN KEY ("contactId")
    REFERENCES "OutreachContact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OutreachActivity_contactId_occurredAt_idx"
  ON "OutreachActivity"("contactId", "occurredAt");

-- Internal data: keep it out of the public PostgREST API.
ALTER TABLE "OutreachContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutreachActivity" ENABLE ROW LEVEL SECURITY;
