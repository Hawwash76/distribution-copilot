import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { type Opportunity } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { CompetitorMonitorService } from "./competitor-monitor.service";

@Controller("products")
@UseGuards(SessionGuard)
export class CompetitorMonitorController {
  constructor(private readonly competitorMonitorService: CompetitorMonitorService) {}

  /** Returns opportunities flagged as competitor signals (frustration or active evaluation) for a product. */
  @Get(":id/competitor-monitor")
  findCompetitorSignals(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ): Promise<Opportunity[]> {
    return this.competitorMonitorService.findCompetitorSignals(id, user.id);
  }
}
