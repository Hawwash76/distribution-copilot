import { Injectable, NotFoundException } from "@nestjs/common";
import { type Opportunity } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { CompetitorMonitorRepository } from "./competitor-monitor.repository";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsRepository } from "../products/products.repository";

/**
 * Business logic for the competitor-monitor feature.
 * Enforces ownership by verifying the product belongs to the requesting user.
 */
@Injectable()
export class CompetitorMonitorService {
  constructor(
    private readonly competitorMonitor: CompetitorMonitorRepository,
    private readonly products: ProductsRepository,
  ) {}

  async findCompetitorSignals(productId: string, userId: string): Promise<Opportunity[]> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.competitorMonitor.findCompetitorSignals(productId);
  }
}
