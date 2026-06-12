import { Injectable } from "@nestjs/common";
import { type DashboardStats } from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { StatsRepository } from "./stats.repository";

/** Returns aggregated statistics for the authenticated user's dashboard. */
@Injectable()
export class StatsService {
  constructor(private readonly stats: StatsRepository) {}

  getStats(userId: string): Promise<DashboardStats> {
    return this.stats.getDashboardStats(userId);
  }
}
