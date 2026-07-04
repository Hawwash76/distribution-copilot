import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { type Opportunity } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
import { SubscriptionGuard } from "../../common/subscription.guard";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { CompetitorMonitorService } from "./competitor-monitor.service";

const DEFAULT_PRIORITY_LIMIT = 5;

/** No class-level path — routes span both a per-product resource and a cross-product one. */
@Controller()
@UseGuards(SessionGuard, SubscriptionGuard)
export class CompetitorMonitorController {
  constructor(private readonly competitorMonitorService: CompetitorMonitorService) {}

  /** Returns opportunities flagged as competitor signals (frustration or active evaluation) for a product. */
  @Get("products/:id/competitor-monitor")
  findCompetitorSignals(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ): Promise<Opportunity[]> {
    return this.competitorMonitorService.findCompetitorSignals(id, user.id);
  }

  /**
   * Returns the top competitor-signal opportunities across ALL of the user's products —
   * the highest-conversion moments, surfaced front and center regardless of which product
   * they belong to (see docs/IDEAS.md — "switching signal" priority queue).
   */
  @Get("competitor-monitor/priority")
  findPrioritySignals(
    @CurrentUser() user: { id: string },
    @Query("limit") limit?: string,
  ): Promise<Opportunity[]> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : DEFAULT_PRIORITY_LIMIT;
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_PRIORITY_LIMIT;
    return this.competitorMonitorService.findTopSignalsForUser(user.id, safeLimit);
  }
}
