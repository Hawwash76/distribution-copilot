import { Injectable } from "@nestjs/common";
import type { SubscriptionStatus } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/** Raw subscription row shape returned from the DB. */
export interface SubscriptionRow {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  planName: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
}

/** All Prisma access for billing/subscription data. */
@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<SubscriptionRow | null> {
    return this.prisma.db.subscription.findUnique({ where: { userId } });
  }

  async update(
    userId: string,
    data: Partial<Omit<SubscriptionRow, "id" | "userId">>,
  ): Promise<SubscriptionRow> {
    return this.prisma.db.subscription.update({ where: { userId }, data });
  }

  async upsert(
    userId: string,
    data: Partial<Omit<SubscriptionRow, "id" | "userId">>,
  ): Promise<SubscriptionRow> {
    return this.prisma.db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: "trialing",
        planName: "trial",
        trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        ...data,
      },
      update: data,
    });
  }
}
