import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { type Opportunity } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { OpportunitiesService } from "./opportunities.service";

@Controller("products")
@UseGuards(SessionGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  /** Returns all scored opportunities for a product, ranked by overallScore descending. */
  @Get(":id/opportunities")
  findAll(@Param("id") id: string, @CurrentUser() user: { id: string }): Promise<Opportunity[]> {
    return this.opportunitiesService.findByProduct(id, user.id);
  }
}
