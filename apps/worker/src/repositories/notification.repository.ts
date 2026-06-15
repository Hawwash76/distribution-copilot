import { type PrismaClient } from "@prisma/client";

/** Alert config fields needed from the product row. */
export interface ProductAlertConfig {
  id: string;
  name: string;
  slackWebhookUrl: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  alertThreshold: number;
}

/** Opportunity with enough context to build a notification message. */
export interface OpportunityForNotification {
  id: string;
  overallScore: number | null;
  signalType: string | null;
  overallRisk: string | null;
  discussion: {
    title: string;
    url: string;
    source: string;
    community: { name: string } | null;
  };
}

/**
 * All Prisma access for the notification queue processor.
 * Kept separate from ScoringRepository to respect single-responsibility per queue.
 */
export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findProductAlertConfig(productId: string): Promise<ProductAlertConfig | null> {
    return this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slackWebhookUrl: true,
        telegramBotToken: true,
        telegramChatId: true,
        alertThreshold: true,
      },
    });
  }

  async findOpportunitiesForNotification(
    opportunityIds: string[],
  ): Promise<OpportunityForNotification[]> {
    const rows = await this.prisma.opportunity.findMany({
      where: { id: { in: opportunityIds }, notifiedAt: null },
      select: {
        id: true,
        overallScore: true,
        signalType: true,
        overallRisk: true,
        discussion: {
          select: {
            title: true,
            url: true,
            source: true,
            community: { select: { name: true } },
          },
        },
      },
    });
    return rows;
  }

  async markNotified(opportunityIds: string[], notifiedAt: Date): Promise<void> {
    await this.prisma.opportunity.updateMany({
      where: { id: { in: opportunityIds } },
      data: { notifiedAt },
    });
  }
}
