-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('low', 'medium', 'high');

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "linkRisk" INTEGER,
ADD COLUMN     "moderationRisk" INTEGER,
ADD COLUMN     "overallRisk" "risk_level",
ADD COLUMN     "promotionRisk" INTEGER,
ADD COLUMN     "riskModel" TEXT,
ADD COLUMN     "riskRationale" TEXT,
ADD COLUMN     "riskWarnings" TEXT[],
ADD COLUMN     "ruleViolationRisk" INTEGER;
