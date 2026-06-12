import { Injectable, NotFoundException } from "@nestjs/common";
import {
  type DiscussionSource,
  type MonitorStatus,
  discussionSourceSchema,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { PrismaService } from "../../common/prisma.service";
import { type MonitorsRepository } from "./monitors.repository";

/**
 * Business logic for the monitors feature.
 * Enforces product ownership before delegating to the repository.
 */
@Injectable()
export class MonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: MonitorsRepository,
  ) {}

  /** Returns all 6 source monitor statuses for a product owned by userId. */
  async listForProduct(productId: string, userId: string): Promise<MonitorStatus[]> {
    await this.assertOwnership(productId, userId);
    return this.repository.findOrCreateAll(productId);
  }

  /**
   * Toggles monitoring for a single source on a product.
   * Validates that source is a known DiscussionSource value.
   */
  async toggle(
    productId: string,
    source: string,
    enabled: boolean,
    userId: string,
  ): Promise<MonitorStatus> {
    await this.assertOwnership(productId, userId);

    const parsed = discussionSourceSchema.safeParse(source);
    if (!parsed.success) {
      throw new NotFoundException(`Unknown source: ${source}`);
    }

    return this.repository.toggle(productId, parsed.data as DiscussionSource, enabled);
  }

  private async assertOwnership(productId: string, userId: string): Promise<void> {
    const product = await this.prisma.db.product.findFirst({
      where: { id: productId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
  }
}
