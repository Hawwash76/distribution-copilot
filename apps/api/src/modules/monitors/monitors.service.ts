import { Injectable, NotFoundException } from "@nestjs/common";
import {
  type DiscussionSource,
  type MonitorStatus,
  discussionSourceSchema,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { PrismaService } from "../../common/prisma.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { MonitorsRepository } from "./monitors.repository";

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

  /**
   * Enables monitoring on every source except "web" (which has no search client
   * in the monitor processor and would only ever be a no-op row). Called
   * automatically after a profile save so ongoing listening starts without a
   * manual toggle. No ownership check — callers already hold a verified productId.
   */
  async enableAllForProduct(productId: string): Promise<void> {
    const statuses = await this.repository.findOrCreateAll(productId);
    await Promise.all(
      statuses
        .filter((s) => s.source !== "web" && !s.enabled)
        .map((s) => this.repository.toggle(productId, s.source, true)),
    );
  }

  private async assertOwnership(productId: string, userId: string): Promise<void> {
    const product = await this.prisma.db.product.findFirst({
      where: { id: productId, userId, isDeleted: false },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
  }
}
