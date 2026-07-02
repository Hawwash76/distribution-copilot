import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { type AggregatedPainPoint } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ResearchService } from "./research.service";

@Controller("products")
@UseGuards(SessionGuard)
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  /** Returns aggregated pain points for a product, ranked by frequency × intensity. */
  @Get(":id/research/pain-points")
  getPainPoints(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ): Promise<AggregatedPainPoint[]> {
    return this.researchService.getPainPoints(id, user.id);
  }
}
