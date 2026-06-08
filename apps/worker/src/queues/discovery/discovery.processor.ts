import { z as zod } from "@distribution-copilot/shared";
import { prisma } from "@distribution-copilot/database";

import { createRedditConnector } from "../../connectors/reddit/reddit.connector.js";
import { DiscoveryRepository } from "../../repositories/discovery.repository.js";
import { type DiscoveryJobPayload, type DiscoveryJobResult } from "./discovery.types.js";

const payloadSchema = zod.object({
  productId: zod.string().min(1),
  keywords: zod.array(zod.string().min(1)).min(1),
  subreddits: zod.array(zod.string()).optional(),
});

/**
 * Core logic for the discovery job — fully isolated from BullMQ so it can be
 * tested without a queue.
 *
 * Steps:
 *   1. Validate payload.
 *   2. Search Reddit for each keyword.
 *   3. Upsert each unique community found in the results.
 *   4. Upsert each post as an Opportunity linked to the product.
 */
export async function runDiscovery(
  raw: unknown,
  log: (msg: string) => void = console.log,
): Promise<DiscoveryJobResult> {
  const payload = payloadSchema.parse(raw) as DiscoveryJobPayload;
  const { productId, keywords, subreddits } = payload;

  log(
    `[discovery] product=${productId} keywords=${keywords.join(",")} subreddits=${subreddits?.join(",") ?? "all"}`,
  );

  const connector = createRedditConnector();
  const repo = new DiscoveryRepository(prisma);

  // 1. Search for posts across all keywords.
  const posts = await connector.search(keywords, { limit: 25, subreddits });
  log(`[discovery] found ${String(posts.length)} posts`);

  // 2. Collect unique community external IDs from the results.
  const communityIds = [...new Set(posts.map((p) => p.communityExternalId))];

  // 3. Upsert communities (fetch metadata for each).
  const communityMap = new Map<string, string>(); // externalId → DB id
  let communitiesUpserted = 0;

  for (const externalId of communityIds) {
    const raw = await connector.fetchCommunity(externalId);
    const community = await repo.upsertCommunity(
      raw ?? { externalId, name: externalId, description: null, subscriberCount: null },
      "reddit",
    );
    communityMap.set(externalId, community.id);
    communitiesUpserted++;
  }

  // 4. Upsert opportunities.
  let opportunitiesUpserted = 0;

  for (const post of posts) {
    const communityId = communityMap.get(post.communityExternalId);
    if (!communityId) continue;

    await repo.upsertOpportunity(post, productId, communityId, "reddit");
    opportunitiesUpserted++;
  }

  log(
    `[discovery] done — communities=${String(communitiesUpserted)} opportunities=${String(opportunitiesUpserted)}`,
  );

  return { communitiesUpserted, opportunitiesUpserted };
}
