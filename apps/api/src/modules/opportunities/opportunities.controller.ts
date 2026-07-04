import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  type Opportunity,
  markEngagedInputSchema,
  updateOpportunityStatusInputSchema,
} from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
import { SubscriptionGuard } from "../../common/subscription.guard";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { OpportunitiesService } from "./opportunities.service";

@Controller("products")
@UseGuards(SessionGuard, SubscriptionGuard)
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

  /** Re-generates the AI reply draft using the current product profile. */
  @Post(":id/opportunities/:opportunityId/regenerate-reply")
  @HttpCode(204)
  regenerateReply(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    return this.opportunitiesService.regenerateReply(id, opportunityId, user.id);
  }

  /**
   * Records that the user engaged with this opportunity off-platform.
   * The reply text they actually posted is stored for CRM tracking.
   */
  @Post(":id/opportunities/:opportunityId/engage")
  @HttpCode(204)
  async markEngaged(
    @Param("id") id: string,
    @Param("opportunityId") opportunityId: string,
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    const { reply } = markEngagedInputSchema.parse(body);
    return this.opportunitiesService.markEngaged(id, opportunityId, user.id, reply);
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
