-- CreateTable
CREATE TABLE "pain_points" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pain_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pain_points_discussionId_idx" ON "pain_points"("discussionId");

-- AddForeignKey
ALTER TABLE "pain_points" ADD CONSTRAINT "pain_points_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
