-- Create user saved listings table
CREATE TABLE "SavedVendor" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedVendor_pkey" PRIMARY KEY ("id")
);

-- Prevent duplicate saves for same user + vendor
CREATE UNIQUE INDEX "SavedVendor_userId_vendorId_key" ON "SavedVendor"("userId", "vendorId");
CREATE INDEX "SavedVendor_userId_createdAt_idx" ON "SavedVendor"("userId", "createdAt");
CREATE INDEX "SavedVendor_vendorId_idx" ON "SavedVendor"("vendorId");

ALTER TABLE "SavedVendor"
ADD CONSTRAINT "SavedVendor_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
