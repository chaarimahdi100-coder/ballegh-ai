-- ==============================================================================
-- BALLEGH AI — INITIAL CORE DATABASE MIGRATION
-- ==============================================================================
-- Module: Infrastructure Civique (Nids-de-poule, Éclairage public, Inondations)
-- Contexte: Grand Tunis
-- Safety: Non-destructive DDL only (CREATE TYPE, CREATE TABLE, CREATE INDEX, ADD CONSTRAINT)
-- ==============================================================================

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CITIZEN', 'MUNICIPAL_AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('POTHOLE', 'LIGHTING', 'FLOODING');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('RECEIVED', 'AI_ANALYZED', 'HUMAN_VALIDATED', 'FORWARDED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HumanDecisionType" AS ENUM ('ACCEPTED', 'MODIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimelineAuthorRole" AS ENUM ('CITIZEN', 'MUNICIPAL_AGENT', 'ADMIN', 'SYSTEM_AI');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CITIZEN',
    "district" TEXT,
    "organization" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "governorate" TEXT NOT NULL DEFAULT 'Tunis',
    "municipality" TEXT NOT NULL DEFAULT 'Commune de Tunis',
    "district" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "landmark" TEXT,
    "officialEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "officialEmailSentAt" TIMESTAMP(3),
    "resolutionConfirmedByCitizen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedById" TEXT NOT NULL,
    "duplicateClusterId" TEXT,
    "assignedServiceId" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "predictedCategory" "IssueCategory" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "estimatedSeverity" INTEGER NOT NULL,
    "severityRationaleFr" TEXT NOT NULL,
    "severityRationaleAr" TEXT NOT NULL,
    "priorityScore" INTEGER NOT NULL,
    "baseSeverityWeight" INTEGER NOT NULL DEFAULT 35,
    "densityWeight" INTEGER NOT NULL DEFAULT 20,
    "sensitiveZoneProximity" BOOLEAN NOT NULL DEFAULT false,
    "agingWeight" INTEGER NOT NULL DEFAULT 10,
    "isLikelyDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "duplicateExplanationFr" TEXT,
    "duplicateExplanationAr" TEXT,
    "suggestedServiceCode" TEXT NOT NULL,
    "draftEmailDept" TEXT NOT NULL,
    "draftEmailTo" TEXT NOT NULL,
    "draftEmailSubject" TEXT NOT NULL,
    "draftEmailBody" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_reviews" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "decision" "HumanDecisionType" NOT NULL,
    "decisionNotes" TEXT,
    "adjustedCategory" "IssueCategory",
    "adjustedSeverity" INTEGER,
    "adjustedPriority" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorRole" "TimelineAuthorRole" NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "commentFr" TEXT,
    "commentAr" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_photos" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipal_services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "headOfService" TEXT NOT NULL,
    "averageSlaDays" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "municipal_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_clusters" (
    "id" TEXT NOT NULL,
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "reports_referenceNumber_key" ON "reports"("referenceNumber");

-- CreateIndex
CREATE INDEX "reports_category_status_idx" ON "reports"("category", "status");

-- CreateIndex
CREATE INDEX "reports_latitude_longitude_idx" ON "reports"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_reportId_key" ON "ai_analyses"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "human_reviews_reportId_key" ON "human_reviews"("reportId");

-- CreateIndex
CREATE INDEX "timeline_events_reportId_timestamp_idx" ON "timeline_events"("reportId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "municipal_services_code_key" ON "municipal_services"("code");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_duplicateClusterId_fkey" FOREIGN KEY ("duplicateClusterId") REFERENCES "duplicate_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignedServiceId_fkey" FOREIGN KEY ("assignedServiceId") REFERENCES "municipal_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
