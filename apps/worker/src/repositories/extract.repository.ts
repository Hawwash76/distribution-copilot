import { type PrismaClient } from "@distribution-copilot/database";
import { type DiscussionSource } from "@distribution-copilot/shared";

import { type ExtractedContent } from "../clients/extract/content-extractor.js";

/** Minimal community shape needed to upsert the DB record. */
export interface RawCommunity {
  externalId: string;
  name: string;
  description: string | null;
  subscriberCount: number | null;
}

/**
 * All Prisma access for the extract pipeline.
 * Every write is an upsert — safe to rerun on BullMQ retry.
 */
export class ExtractRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Upserts a community record and returns its DB id. */
  async upsertCommunity(
    raw: RawCommunity,
    source: DiscussionSource,
  ): Promise<{ id: string; name: string }> {
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
      select: { id: true, name: true },
    });
    return row;
  }

  /** Upserts a Discussion record (unique on url) and returns its DB id. */
  async upsertDiscussion(
    content: ExtractedContent,
    url: string,
    communityId: string | null,
  ): Promise<{ id: string }> {
    const row = await this.db.discussion.upsert({
      where: { url },
      update: {
        title: content.title,
        body: content.body,
        author: content.author,
        platformScore: content.platformScore,
        commentCount: content.commentCount,
        publishedAt: content.publishedAt,
        fetchedAt: new Date(),
        communityId,
      },
      create: {
        source: content.source,
        externalId: content.externalId,
        url,
        title: content.title,
        body: content.body,
        author: content.author,
        platformScore: content.platformScore,
        commentCount: content.commentCount,
        publishedAt: content.publishedAt,
        communityId,
      },
      select: { id: true },
    });
    return row;
  }

  /**
   * Upserts an Opportunity (unique on productId + discussionId).
   * Returns the id and whether the record was newly created.
   */
  async upsertOpportunity(
    discussionId: string,
    productId: string,
  ): Promise<{ id: string; created: boolean }> {
    // Check existence first so we can report whether this is a new opportunity.
    const existing = await this.db.opportunity.findUnique({
      where: { productId_discussionId: { productId, discussionId } },
      select: { id: true },
    });

    if (existing) {
      return { id: existing.id, created: false };
    }

    const row = await this.db.opportunity.create({
      data: { productId, discussionId, status: "new" },
      select: { id: true },
    });

    return { id: row.id, created: true };
  }
}
