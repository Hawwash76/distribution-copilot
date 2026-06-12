import { Controller, Get, UseGuards } from "@nestjs/common";
import { type DashboardStats } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { StatsService } from "./stats.service";

/** Aggregated statistics for the authenticated user's home dashboard. */
@Controller("stats")
@UseGuards(SessionGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@CurrentUser() user: { id: string }): Promise<DashboardStats> {
    return this.statsService.getStats(user.id);
  }
}
