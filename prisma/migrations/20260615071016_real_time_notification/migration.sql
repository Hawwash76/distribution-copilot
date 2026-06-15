-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "alertThreshold" INTEGER NOT NULL DEFAULT 70,
ADD COLUMN     "slackWebhookUrl" TEXT,
ADD COLUMN     "telegramBotToken" TEXT,
ADD COLUMN     "telegramChatId" TEXT;
