import { Injectable, NotFoundException } from "@nestjs/common";
import {
  type Opportunity,
  type UpdateOpportunityStatusInput,
  type Paginated,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { OpportunitiesRepository } from "./opportunities.repository";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsRepository } from "../products/products.repository";

export interface FindByProductOptions {
  page?: number;
  pageSize?: number;
  includeDismissed?: boolean;
}

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

  async findByProduct(
    productId: string,
    userId: string,
    options: FindByProductOptions = {},
  ): Promise<Paginated<Opportunity>> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.opportunities.findScoredByProduct(productId, options);
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
    input: UpdateOpportunityStatusInput,
  ): Promise<Opportunity> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    return this.opportunities.updateStatus(opportunityId, productId, input.status);
  }
}
