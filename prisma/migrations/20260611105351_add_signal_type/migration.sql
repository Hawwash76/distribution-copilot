-- CreateEnum
CREATE TYPE "signal_type" AS ENUM ('RECOMMENDATION_REQUEST', 'COMPETITOR_FRUSTRATION', 'ACTIVE_EVALUATION', 'PAIN_EXPRESSION', 'BUDGET_SIGNAL', 'CATEGORY_RESEARCH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "discussion_source" ADD VALUE 'stackoverflow';
ALTER TYPE "discussion_source" ADD VALUE 'lobsters';
ALTER TYPE "discussion_source" ADD VALUE 'devto';

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "signalRationale" TEXT,
ADD COLUMN     "signalType" "signal_type";
