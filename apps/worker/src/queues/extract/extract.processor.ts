import { z as zod } from "@distribution-copilot/shared";
import { prisma } from "@distribution-copilot/database";

import { extractContent } from "../../clients/extract/content-extractor.js";
import { ExtractRepository } from "../../repositories/extract.repository.js";
import { type ExtractJobPayload, type ExtractJobResult } from "./extract.types.js";

const payloadSchema = zod.object({
  url: zod.string().url(),
  productId: zod.string().min(1),
  sourceTitle: zod.string(),
  sourceSnippet: zod.string(),
});

/**
 * Core logic for the extract job — isolated from BullMQ for testability.
 *
 * Steps:
 *   1. Validate payload.
 *   2. Extract structured content from the URL (platform-specific or fallback).
 *   3. Apply quality gate — null return means skip (deleted/NSFW/no-discussion/etc.).
 *   4. Upsert Community if the content belongs to one (e.g. subreddit).
 *   5. Upsert Discussion (unique on url).
 *   6. Upsert Opportunity linking the Discussion to the Product.
 */
export async function runExtract(
  raw: unknown,
  log: (msg: string) => void = console.log,
): Promise<ExtractJobResult> {
  const payload = payloadSchema.parse(raw) as ExtractJobPayload;
  const { url, productId, sourceTitle, sourceSnippet } = payload;

  log(`[extract] url=${url} product=${productId}`);

  const content = await extractContent(url, { title: sourceTitle, snippet: sourceSnippet });

  // null means the content failed a quality gate — skip without creating records.
  if (content === null) {
    log(`[extract] skipped url=${url} (quality gate)`);
    return { discussionId: null, opportunityCreated: false, skipped: true };
  }

  log(`[extract] source=${content.source} title="${content.title.slice(0, 60)}"`);

  const repo = new ExtractRepository(prisma);

  // Upsert community if the content is from a platform community (e.g. subreddit).
  let communityId: string | null = null;
  if (content.communityExternalId) {
    const community = await repo.upsertCommunity(
      {
        externalId: content.communityExternalId,
        name: content.communityExternalId,
        description: null,
        subscriberCount: null,
      },
      content.source,
    );
    communityId = community.id;
    log(`[extract] community=${content.communityExternalId} id=${communityId}`);
  }

  const discussion = await repo.upsertDiscussion(content, url, communityId);
  log(`[extract] discussion id=${discussion.id}`);

  const opportunity = await repo.upsertOpportunity(discussion.id, productId);
  log(`[extract] opportunity id=${opportunity.id} created=${String(opportunity.created)}`);

  return { discussionId: discussion.id, opportunityCreated: opportunity.created, skipped: false };
}
