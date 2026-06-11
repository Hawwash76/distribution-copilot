import { Body, Controller, Delete, Get, HttpCode, Param, Patch, UseGuards } from "@nestjs/common";
import { type Opportunity, updateOpportunityStatusInputSchema } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { OpportunitiesService } from "./opportunities.service";

@Controller("products")
@UseGuards(SessionGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  /** Returns all opportunities for a product across all statuses, ordered by createdAt desc. */
  @Get(":id/opportunities")
  findAll(@Param("id") id: string, @CurrentUser() user: { id: string }): Promise<Opportunity[]> {
    return this.opportunitiesService.findByProduct(id, user.id);
  }

  /** Returns a single opportunity with full detail including AI rationales. */
  @Get(":id/opportunities/:opportunityId")
  findOne(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @CurrentUser() user: { id: string },
  ): Promise<Opportunity> {
    return this.opportunitiesService.findOne(id, opportunityId, user.id);
  }

  /** Updates the status of an opportunity (scored → reviewed, dismissed, etc.). */
  @Patch(":id/opportunities/:opportunityId")
  @HttpCode(204)
  async updateStatus(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    const { status } = updateOpportunityStatusInputSchema.parse(body);
    return this.opportunitiesService.updateStatus(id, opportunityId, user.id, status);
  }

  /** Permanently deletes an opportunity. */
  @Delete(":id/opportunities/:opportunityId")
  @HttpCode(204)
  delete(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    return this.opportunitiesService.delete(id, opportunityId, user.id);
  }
}
