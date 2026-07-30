-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('SAAS', 'ECOMMERCE', 'CONTENT', 'LOCAL');

-- CreateEnum
CREATE TYPE "SitePlatform" AS ENUM ('SHOPIFY', 'WORDPRESS', 'WEBFLOW', 'NEXTJS', 'OTHER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "platform" "SitePlatform",
ADD COLUMN     "siteType" "SiteType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);
