import { Injectable, NotFoundException } from "@nestjs/common";
import { type AggregatedPainPoint } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ResearchRepository } from "./research.repository";

/** Business logic for the research feature — all operations scoped to the authenticated user. */
@Injectable()
export class ResearchService {
  constructor(private readonly research: ResearchRepository) {}

  async getPainPoints(productId: string, userId: string): Promise<AggregatedPainPoint[]> {
    // Verify the product belongs to this user before querying.
    const exists = await this.research.productBelongsToUser(productId, userId);
    if (!exists) throw new NotFoundException(`Product ${productId} not found`);
    return this.research.findAggregatedPainPoints(productId);
  }
}
