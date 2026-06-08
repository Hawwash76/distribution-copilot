-- CreateEnum
CREATE TYPE "opportunity_source" AS ENUM ('reddit');

-- CreateEnum
CREATE TYPE "opportunity_status" AS ENUM ('new', 'scored', 'reviewed', 'dismissed');

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "source" "opportunity_source" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subscriberCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "source" "opportunity_source" NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "opportunity_status" NOT NULL DEFAULT 'new',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_source_externalId_key" ON "communities"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_source_externalId_productId_key" ON "opportunities"("source", "externalId", "productId");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
