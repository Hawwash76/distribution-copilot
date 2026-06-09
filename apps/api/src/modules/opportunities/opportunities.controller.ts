import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import {
  updateOpportunityStatusSchema,
  type Opportunity,
  type UpdateOpportunityStatusInput,
  type Paginated,
} from "@distribution-copilot/shared";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { OpportunitiesService } from "./opportunities.service";

@Controller("products")
@UseGuards(SessionGuard)
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  /** Returns paginated scored opportunities for a product, ranked by overallScore descending. */
  @Get(":id/opportunities")
  findAll(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("includeDismissed") includeDismissed?: string,
  ): Promise<Paginated<Opportunity>> {
    return this.opportunitiesService.findByProduct(id, user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      includeDismissed: includeDismissed === "true",
    });
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

  /** Updates the status of an opportunity (reviewed or dismissed). */
  @Patch(":id/opportunities/:opportunityId/status")
  updateStatus(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @Body(new ZodValidationPipe(updateOpportunityStatusSchema)) dto: UpdateOpportunityStatusInput,
    @CurrentUser() user: { id: string },
  ): Promise<Opportunity> {
    return this.opportunitiesService.updateStatus(id, opportunityId, user.id, dto);
  }
}
