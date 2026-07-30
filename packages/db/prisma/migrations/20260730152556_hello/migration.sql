-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "dodoProductId" TEXT,
ADD COLUMN     "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "WebhookEvent" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT;

-- CreateTable
CREATE TABLE "CompetitorRanking" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "position" INTEGER,
    "url" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorRanking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorRanking_competitorId_checkedAt_idx" ON "CompetitorRanking"("competitorId", "checkedAt");

-- CreateIndex
CREATE INDEX "CompetitorRanking_keywordId_checkedAt_idx" ON "CompetitorRanking"("keywordId", "checkedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_type_createdAt_idx" ON "WebhookEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "CompetitorRanking" ADD CONSTRAINT "CompetitorRanking_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorRanking" ADD CONSTRAINT "CompetitorRanking_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
