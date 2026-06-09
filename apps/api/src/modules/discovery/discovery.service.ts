import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Queue } from "bullmq";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { PrismaService } from "../../common/prisma.service";

/**
 * Validates product ownership then enqueues a discovery job.
 * The worker loads keywords from the product's AI profile internally.
 */
@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("DISCOVERY_QUEUE") private readonly queue: Queue,
  ) {}

  async enqueueForProduct(productId: string, userId: string): Promise<{ jobId: string }> {
    const product = await this.prisma.db.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const job = await this.queue.add(
      "discover",
      { productId },
      {
        jobId: `discovery:${productId}:${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      },
    );

    return { jobId: job.id ?? "" };
  }
}
