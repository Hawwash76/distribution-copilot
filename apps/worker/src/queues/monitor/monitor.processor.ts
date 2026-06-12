import { prisma } from "@distribution-copilot/database";
import { Queue } from "bullmq";

import { type DiscoverySource } from "../../clients/discovery-source.js";
import { hnSource } from "../../clients/hn/hn-search.js";
import { redditSource } from "../../clients/reddit/reddit-search.js";
import {
  stackOverflowSource,
  softwareRecsSource,
} from "../../clients/stackoverflow/stackoverflow-search.js";
import { lobstersSource } from "../../clients/lobsters/lobsters-search.js";
import { devToSource } from "../../clients/devto/devto-search.js";
import { redisConnection } from "../../config/redis.js";
import { EXTRACT_QUEUE } from "../extract/extract.types.js";
import { type MonitorJobResult } from "./monitor.types.js";

/** How far back to backfill on first run (no lastCheckedAt). */
const INITIAL_BACKFILL_DAYS = 30;

/** Results to request from each source per query. */
const RESULTS_PER_QUERY = 25;

/** Delay between requests to respect platform rate limits. */
const INTER_REQUEST_DELAY_MS = 1_000;

/** Maximum keywords to search per monitor run. */
const MAX_KEYWORDS = 5;

/** Maximum competitor names per monitor run. */
const MAX_COMPETITORS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Maps a DiscussionSource string to the corresponding discovery source client. */
const SOURCE_MAP: Record<string, DiscoverySource | undefined> = {
  reddit: redditSource,
  hackernews: hnSource,
  stackoverflow: stackOverflowSource,
  softwarerecs: softwareRecsSource,
  lobsters: lobstersSource,
  devto: devToSource,
  // "web" has no direct search client — skip gracefully
};

/**
 * Core logic for the monitor sweep job.
 *
 * Finds every enabled ProductMonitor row, groups by product, and for each
 * enabled source runs keyword + competitor queries filtered by lastCheckedAt
 * (or INITIAL_BACKFILL_DAYS ago for first-time monitors). URLs are deduplicated
 * and fed into the existing "extract" queue. lastCheckedAt is stamped after each
 * monitor is processed.
 *
 * Idempotent: Discussion is unique on url; Opportunity is unique on
 * (productId, discussionId) — re-processing already-seen URLs is safe.
 */
export async function runMonitor(
  log: (msg: string) => void = console.log,
): Promise<MonitorJobResult> {
  log("[monitor] starting sweep");

  const enabledMonitors = await prisma.productMonitor.findMany({
    where: { enabled: true },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          competitors: true,
          isDeleted: true,
          profile: {
            select: { keywords: true, competitors: true },
          },
        },
      },
    },
  });

  // Skip monitors for deleted products or products without a profile
  const active = enabledMonitors.filter((m) => !m.product.isDeleted && m.product.profile !== null);

  log(`[monitor] found ${String(active.length)} active monitor(s) to sweep`);

  if (active.length === 0) return { monitorsSwepted: 0, extractJobsEnqueued: 0 };

  const extractQueue = new Queue(EXTRACT_QUEUE, { connection: redisConnection });
  let monitorsSwepted = 0;
  let extractJobsEnqueued = 0;

  for (const monitor of active) {
    const client = SOURCE_MAP[monitor.source];
    if (!client) {
      log(`[monitor] skipping source=${monitor.source} (no client)`);
      continue;
    }

    const since = monitor.lastCheckedAt
      ? monitor.lastCheckedAt
      : new Date(Date.now() - INITIAL_BACKFILL_DAYS * 24 * 60 * 60 * 1000);

    log(
      `[monitor] product=${monitor.productId} source=${monitor.source} since=${since.toISOString()}`,
    );

    const profile = monitor.product.profile;
    if (!profile) continue;

    const keywordQueries =
      profile.keywords.length > 0
        ? profile.keywords.slice(0, MAX_KEYWORDS)
        : [monitor.product.name];

    const competitorNames: string[] = [];
    if (profile.competitors.length > 0) {
      competitorNames.push(...profile.competitors.slice(0, MAX_COMPETITORS));
    } else if (monitor.product.competitors) {
      competitorNames.push(
        ...monitor.product.competitors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, MAX_COMPETITORS),
      );
    }

    const competitorQueries = competitorNames.flatMap((name) => [
      `${name} alternative`,
      `${name} vs`,
    ]);

    const allQueries = [...keywordQueries, ...competitorQueries];
    const seenUrls = new Set<string>();
    const urlsToExtract: { url: string; title: string; snippet: string }[] = [];

    for (let i = 0; i < allQueries.length; i++) {
      if (i > 0) await sleep(INTER_REQUEST_DELAY_MS);
      const query = allQueries[i];
      if (!query) continue;

      const results = await client.search(query, RESULTS_PER_QUERY, { since });
      log(`[monitor] source=${monitor.source} query="${query}" results=${String(results.length)}`);

      for (const result of results) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        urlsToExtract.push(result);
      }
    }

    for (const { url, title, snippet } of urlsToExtract) {
      await extractQueue.add(
        "extract",
        { url, productId: monitor.productId, sourceTitle: title, sourceSnippet: snippet },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 3_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      extractJobsEnqueued++;
    }

    log(
      `[monitor] product=${monitor.productId} source=${monitor.source} urls=${String(urlsToExtract.length)}`,
    );

    // Stamp lastCheckedAt so the next sweep fetches only what's new
    await prisma.productMonitor.update({
      where: { id: monitor.id },
      data: { lastCheckedAt: new Date() },
    });

    monitorsSwepted++;
  }

  log(
    `[monitor] done — monitorsSwepted=${String(monitorsSwepted)} extractJobsEnqueued=${String(extractJobsEnqueued)}`,
  );

  return { monitorsSwepted, extractJobsEnqueued };
}
