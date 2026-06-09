-- SERP pipeline migration: replace Reddit-only source with Discussion model.
-- Introduces discussion_source enum, discussions table, and restructures opportunities
-- to reference discussions instead of holding content directly.

-- CreateEnum
CREATE TYPE "discussion_source" AS ENUM ('reddit', 'hackernews', 'web');

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_communityId_fkey";

-- DropIndex
DROP INDEX "opportunities_source_externalId_productId_key";

-- AlterTable communities: replace opportunity_source with discussion_source
ALTER TABLE "communities" DROP COLUMN "source",
ADD COLUMN     "source" "discussion_source" NOT NULL;

-- AlterTable opportunities: remove content columns, add discussionId + AI score columns
ALTER TABLE "opportunities" DROP COLUMN "author",
DROP COLUMN "body",
DROP COLUMN "commentCount",
DROP COLUMN "communityId",
DROP COLUMN "externalId",
DROP COLUMN "publishedAt",
DROP COLUMN "score",
DROP COLUMN "source",
DROP COLUMN "title",
DROP COLUMN "url",
ADD COLUMN     "discussionId" TEXT NOT NULL,
ADD COLUMN     "painScore" INTEGER,
ADD COLUMN     "urgencyScore" INTEGER;

-- DropEnum
DROP TYPE "opportunity_source";

-- CreateTable
CREATE TABLE "discussions" (
    "id" TEXT NOT NULL,
    "source" "discussion_source" NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "author" TEXT,
    "platformScore" INTEGER,
    "commentCount" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discussions_url_key" ON "discussions"("url");

-- CreateIndex
CREATE UNIQUE INDEX "communities_source_externalId_key" ON "communities"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_productId_discussionId_key" ON "opportunities"("productId", "discussionId");

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
