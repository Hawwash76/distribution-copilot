import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import {
  type Opportunity,
  type OpportunityStatus,
  type RiskWarning,
} from "@distribution-copilot/shared";
import { generateReplyDraft, type Provider } from "@distribution-copilot/ai";

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
    @Inject("AI_PROVIDER") private readonly aiProvider: Provider,
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

  async markEngaged(
    productId: string,
    opportunityId: string,
    userId: string,
    reply: string,
  ): Promise<void> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    await this.opportunities.markEngaged(opportunityId, productId, reply, new Date());
  }

  /**
   * Re-generates the AI reply draft for an opportunity using the current product profile.
   * Requires the opportunity to have been scored (profile + risk data must exist).
   */
  async regenerateReply(productId: string, opportunityId: string, userId: string): Promise<void> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    const profile = await this.products.findProfile(productId);
    if (!profile) {
      throw new BadRequestException(
        "No product profile found — generate a profile first before regenerating the reply draft.",
      );
    }

    const { draft, model } = await generateReplyDraft(
      opportunity.title,
      opportunity.body ?? "",
      opportunity.communityName ?? "",
      profile,
      (opportunity.riskWarnings ?? []) as RiskWarning[],
      opportunity.signalType,
      this.aiProvider,
    );

    await this.opportunities.updateReplyDraft(opportunityId, productId, draft.draft, model);
  }

  async delete(productId: string, opportunityId: string, userId: string): Promise<void> {
    const product = await this.products.findOneByUser(productId, userId);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const opportunity = await this.opportunities.findById(opportunityId, productId);
    if (!opportunity) throw new NotFoundException(`Opportunity ${opportunityId} not found`);

    await this.opportunities.deleteById(opportunityId, productId);
  }
}
