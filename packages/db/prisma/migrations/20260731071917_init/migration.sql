-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('TECHNICAL', 'ON_PAGE', 'CONTENT', 'SPEED');

-- CreateEnum
CREATE TYPE "KeywordDemand" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifyEmail" TEXT;

-- AlterTable
ALTER TABLE "AuditIssue" ADD COLUMN     "category" "IssueCategory" NOT NULL DEFAULT 'TECHNICAL';

-- AlterTable
ALTER TABLE "Keyword" ADD COLUMN     "demand" "KeywordDemand",
ADD COLUMN     "difficulty" INTEGER;
