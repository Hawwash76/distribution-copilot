import { Injectable } from "@nestjs/common";
import { type AggregatedPainPoint, type PainPointIntensity } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

const INTENSITY_WEIGHT: Record<string, number> = { low: 1, medium: 2, high: 3 };

/**
 * All Prisma access for the research feature.
 * Aggregates pain points across scored discussions for a given product.
 */
@Injectable()
export class ResearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Confirms the product exists and is owned by the given user. */
  async productBelongsToUser(productId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.db.product.findFirst({
      where: { id: productId, userId, isDeleted: false },
      select: { id: true },
    });
    return row !== null;
  }

  /**
   * Returns pain points aggregated by theme across all scored opportunities
   * for the product, ranked by frequency × intensity weight.
   *
   * Groups by exact theme string (MVP — no embedding clustering).
   * Returns at most 30 themes, each with up to 3 supporting quotes.
   */
  async findAggregatedPainPoints(productId: string): Promise<AggregatedPainPoint[]> {
    // Fetch all pain points linked to scored/reviewed/engaged discussions for this product.
    const rows = await this.prisma.db.painPoint.findMany({
      where: {
        discussion: {
          opportunities: {
            some: {
              productId,
              status: { in: ["scored", "reviewed", "engaged"] },
            },
          },
        },
      },
      select: {
        theme: true,
        quote: true,
        intensity: true,
        discussion: {
          select: {
            url: true,
            source: true,
            community: { select: { name: true } },
          },
        },
      },
    });

    // Group by theme.
    const byTheme = new Map<
      string,
      {
        quotes: { quote: string; source: string; url: string }[];
        intensitySum: number;
        count: number;
      }
    >();

    for (const row of rows) {
      const source = buildSourceLabel(
        row.discussion.source,
        row.discussion.community?.name ?? null,
      );
      const entry = byTheme.get(row.theme) ?? { quotes: [], intensitySum: 0, count: 0 };
      entry.count++;
      entry.intensitySum += INTENSITY_WEIGHT[row.intensity] ?? 1;
      if (entry.quotes.length < 3) {
        entry.quotes.push({ quote: row.quote, source, url: row.discussion.url });
      }
      byTheme.set(row.theme, entry);
    }

    // Convert to aggregated shape and sort by score desc.
    const results: AggregatedPainPoint[] = [];
    for (const [theme, entry] of byTheme.entries()) {
      const avgWeight = entry.intensitySum / entry.count;
      const score = entry.count * avgWeight;
      const intensity = avgWeight >= 2.5 ? "high" : avgWeight >= 1.5 ? "medium" : "low";
      results.push({
        theme,
        count: entry.count,
        intensity: intensity as PainPointIntensity,
        score,
        quotes: entry.quotes,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 30);
  }
}

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  stackoverflow: "Stack Overflow",
  lobsters: "Lobsters",
  devto: "Dev.to",
  web: "Web",
};

function buildSourceLabel(source: string, communityName: string | null): string {
  const label = SOURCE_LABELS[source] ?? source;
  return communityName ? `${label} · r/${communityName}` : label;
}
