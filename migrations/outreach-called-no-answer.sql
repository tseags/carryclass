-- Add the "Called - no answer" stage to existing outreach databases.
-- Fresh installs get it from migrations/outreach-crm.sql.
-- Apply: npm run migrate:sql -- --file migrations/outreach-called-no-answer.sql --target listings

ALTER TYPE "OutreachStage" ADD VALUE IF NOT EXISTS 'called_no_answer' AFTER 'called';
