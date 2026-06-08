-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "engagementScore" INTEGER,
ADD COLUMN     "intentScore" INTEGER,
ADD COLUMN     "overallScore" INTEGER,
ADD COLUMN     "recencyScore" INTEGER,
ADD COLUMN     "relevanceScore" INTEGER,
ADD COLUMN     "scoringModel" TEXT;
