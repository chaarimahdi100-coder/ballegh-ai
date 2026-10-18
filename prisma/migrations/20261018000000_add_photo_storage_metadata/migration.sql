-- AlterTable
ALTER TABLE "report_photos" ADD COLUMN IF NOT EXISTS "storagePath" TEXT;
ALTER TABLE "report_photos" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "report_photos" ADD COLUMN IF NOT EXISTS "fileSizeBytes" INTEGER;
