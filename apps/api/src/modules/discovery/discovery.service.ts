import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Queue } from "bullmq";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { PrismaService } from "../../common/prisma.service";

export interface DiscoverInput {
  keywords: string[];
  subreddits?: string[];
}

/** Validates ownership then enqueues a discovery job for the given product. */
@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("DISCOVERY_QUEUE") private readonly queue: Queue,
  ) {}

  async enqueueForProduct(
    productId: string,
    userId: string,
    input: DiscoverInput,
  ): Promise<{ jobId: string }> {
    const product = await this.prisma.db.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const job = await this.queue.add(
      "discover",
      { productId, keywords: input.keywords, subreddits: input.subreddits },
      {
        jobId: `discovery:${productId}:${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      },
    );

    return { jobId: job.id ?? "" };
  }
}
