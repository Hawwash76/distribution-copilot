import { Injectable, NotFoundException } from "@nestjs/common";
import { type Opportunity, type OpportunityStatus } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { OpportunitiesRepository } from "./opportunities.repository";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsRepository } from "../products/products.repository";

/**
 * Business logic for the opportunities feature.
 * Enforces ownership by verifying the product belongs to the requesting user.
 */
@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly opportunities: OpportunitiesRepository,
    private readonly products: ProductsRepository,
  ) {}

  async findByProduct(productId: string, userId: string): Promise<Opportunity[]> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.opportunities.findAllByProduct(productId);
  }

  async findOne(productId: string, opportunityId: string, userId: string): Promise<Opportunity> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    return opportunity;
  }

  async updateStatus(
    productId: string,
    opportunityId: string,
    userId: string,
    status: OpportunityStatus,
  ): Promise<void> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    await this.opportunities.updateStatus(opportunityId, productId, status);
  }

  async delete(productId: string, opportunityId: string, userId: string): Promise<void> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    await this.opportunities.deleteById(opportunityId, productId);
  }
}
