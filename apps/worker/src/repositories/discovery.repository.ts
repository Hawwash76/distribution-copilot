import { type PrismaClient } from "@distribution-copilot/database";
import { type Community, type Opportunity } from "@distribution-copilot/shared";

import { type RawCommunity, type RawPost } from "../connectors/source-connector.js";

/**
 * All Prisma access for the discovery pipeline.
 * Upserts are idempotent — safe to rerun on retry.
 */
export class DiscoveryRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertCommunity(raw: RawCommunity, source: "reddit"): Promise<Community> {
    const row = await this.db.community.upsert({
      where: { source_externalId: { source, externalId: raw.externalId } },
      update: {
        name: raw.name,
        description: raw.description,
        subscriberCount: raw.subscriberCount,
      },
      create: {
        source,
        externalId: raw.externalId,
        name: raw.name,
        description: raw.description,
        subscriberCount: raw.subscriberCount,
      },
    });

    return {
      id: row.id,
      source: row.source,
      externalId: row.externalId,
      name: row.name,
      description: row.description,
      subscriberCount: row.subscriberCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async upsertOpportunity(
    raw: RawPost,
    productId: string,
    communityId: string,
    source: "reddit",
  ): Promise<Opportunity> {
    const row = await this.db.opportunity.upsert({
      where: {
        source_externalId_productId: { source, externalId: raw.externalId, productId },
      },
      update: {
        title: raw.title,
        body: raw.body,
        score: raw.score,
        commentCount: raw.commentCount,
      },
      create: {
        productId,
        communityId,
        source,
        externalId: raw.externalId,
        title: raw.title,
        body: raw.body,
        url: raw.url,
        author: raw.author,
        score: raw.score,
        commentCount: raw.commentCount,
        publishedAt: raw.publishedAt,
      },
    });

    return {
      id: row.id,
      productId: row.productId,
      communityId: row.communityId,
      source: row.source,
      externalId: row.externalId,
      status: row.status,
      title: row.title,
      body: row.body,
      url: row.url,
      author: row.author,
      score: row.score,
      commentCount: row.commentCount,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
