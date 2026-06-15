import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { type Queue } from "bullmq";
import { type DiscussionSource } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { PrismaService } from "../../common/prisma.service";

/**
 * Validates product ownership then enqueues a discovery job.
 * The worker loads keywords from the product's AI profile internally.
 * An optional source filter limits the run to a single platform (useful for testing).
 */
@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("DISCOVERY_QUEUE") private readonly queue: Queue,
  ) {}

  async enqueueForProduct(
    productId: string,
    userId: string,
    source?: DiscussionSource,
  ): Promise<{ jobId: string }> {
    const product = await this.prisma.db.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    // When source is provided, scope the jobId so per-source runs don't collide
    // with each other or with a full-run job.
    const jobId = source ? `discovery-${productId}-${source}` : `discovery-${productId}`;
    const existingJob = await this.queue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === "waiting" || state === "active" || state === "delayed") {
        throw new ConflictException(
          "A discovery job is already running for this product. Please wait for it to finish.",
        );
      }
      // BullMQ deduplicates by jobId across all states including completed/failed.
      // Remove the stale job so queue.add() with the same ID actually enqueues a new run.
      await existingJob.remove();
    }

    const job = await this.queue.add(
      "discover",
      { productId, ...(source ? { source } : {}) },
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      },
    );

    return { jobId: job.id ?? "" };
  }
}
