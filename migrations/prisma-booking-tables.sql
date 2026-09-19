-- Prisma booking / directory models (Vendor, ClassSession, Booking, …).
-- Required for publish → live sync (prisma.vendor.upsert + ClassSession scaffolding).
-- Do NOT use `prisma db push` against this DB — it tries to drop legacy tables
-- (onboarding vendors, carry_class_vendor_data, etc.). Apply via:
--   npm run migrate:sql -- --file migrations/prisma-booking-tables.sql --target listings
--
-- Generated from: prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script

-- CreateEnum
CREATE TYPE "VendorReviewStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CcwTimelineProcess" AS ENUM ('INITIAL', 'RENEWAL', 'MODIFICATION');

-- CreateEnum
CREATE TYPE "CcwTimelineStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CcwTimelineSource" AS ENUM ('DOCX_IMPORT', 'USER_FORM', 'MANUAL');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "countiesServed" TEXT[],
    "classTypes" TEXT[],
    "formats" TEXT[],
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    "priceInitial" INTEGER,
    "priceRenewal" INTEGER,
    "priceAddGun" INTEGER,
    "address" TEXT,
    "discountInfo" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "photos" TEXT[],
    "googleReviewsUrl" TEXT,
    "googlePlaceId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptsBookings" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectAccountId" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedVendor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorReview" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "VendorReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "title" TEXT,
    "classType" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 12,
    "enrolled" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "classAmountCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 700,
    "totalAmountCents" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

-- CreateIndex
CREATE INDEX "Vendor_county_idx" ON "Vendor"("county");

-- CreateIndex
CREATE INDEX "Vendor_slug_idx" ON "Vendor"("slug");

-- CreateIndex
CREATE INDEX "Vendor_featured_idx" ON "Vendor"("featured");

-- CreateIndex
CREATE INDEX "SavedVendor_userId_createdAt_idx" ON "SavedVendor"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedVendor_vendorId_idx" ON "SavedVendor"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedVendor_userId_vendorId_key" ON "SavedVendor"("userId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorReview_vendorId_idx" ON "VendorReview"("vendorId");

-- CreateIndex
CREATE INDEX "VendorReview_vendorId_status_createdAt_idx" ON "VendorReview"("vendorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ClassSession_vendorId_startsAt_idx" ON "ClassSession"("vendorId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CcwTimelineSubmission_sourceRef_key" ON "CcwTimelineSubmission"("sourceRef");

-- CreateIndex
CREATE INDEX "CcwTimelineSubmission_countySlug_idx" ON "CcwTimelineSubmission"("countySlug");

-- CreateIndex
CREATE INDEX "CcwTimelineSubmission_countySlug_process_status_idx" ON "CcwTimelineSubmission"("countySlug", "process", "status");

-- CreateIndex
CREATE INDEX "CcwTimelineSubmission_status_submittedAt_idx" ON "CcwTimelineSubmission"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripeCheckoutSessionId_key" ON "Booking"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "Booking_vendorId_idx" ON "Booking"("vendorId");

-- CreateIndex
CREATE INDEX "Booking_classSessionId_idx" ON "Booking"("classSessionId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- AddForeignKey
ALTER TABLE "SavedVendor" ADD CONSTRAINT "SavedVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReview" ADD CONSTRAINT "VendorReview_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

