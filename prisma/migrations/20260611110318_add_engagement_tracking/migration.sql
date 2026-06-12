-- AlterEnum
ALTER TYPE "opportunity_status" ADD VALUE 'engaged';

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "engagedAt" TIMESTAMP(3),
ADD COLUMN     "engagedReply" TEXT;
