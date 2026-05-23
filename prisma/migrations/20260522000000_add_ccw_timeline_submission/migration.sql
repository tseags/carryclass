-- CreateEnum
CREATE TYPE "CcwTimelineProcess" AS ENUM ('INITIAL', 'RENEWAL', 'MODIFICATION');

-- CreateEnum
CREATE TYPE "CcwTimelineStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CcwTimelineSource" AS ENUM ('DOCX_IMPORT', 'USER_FORM', 'MANUAL');

-- CreateTable
CREATE TABLE "CcwTimelineSubmission" (
    "id" TEXT NOT NULL,
    "countySlug" TEXT NOT NULL,
    "process" "CcwTimelineProcess" NOT NULL,
    "status" "CcwTimelineStatus" NOT NULL DEFAULT 'PENDING',
    "displayName" TEXT NOT NULL DEFAULT 'Anonymous',
    "body" TEXT NOT NULL,
    "dateStarted" TIMESTAMP(3),
    "dateFinished" TIMESTAMP(3),
    "durationDays" INTEGER,
    "totalCostCents" INTEGER,
    "sourceType" "CcwTimelineSource" NOT NULL DEFAULT 'USER_FORM',
    "sourceRef" TEXT,
    "rawText" TEXT,
    "parseConfidence" DOUBLE PRECISION,
    "parseWarnings" TEXT[],
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CcwTimelineSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CcwTimelineSubmission_sourceRef_key" ON "CcwTimelineSubmission"("sourceRef");

-- CreateIndex
CREATE INDEX "CcwTimelineSubmission_countySlug_idx" ON "CcwTimelineSubmission"("countySlug");

-- CreateIndex
CREATE INDEX "CcwTimelineSubmission_countySlug_process_status_idx" ON "CcwTimelineSubmission"("countySlug", "process", "status");

-- CreateIndex
CREATE INDEX "CcwTimelineSubmission_status_submittedAt_idx" ON "CcwTimelineSubmission"("status", "submittedAt");
