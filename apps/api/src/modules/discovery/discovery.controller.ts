import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { DiscoveryService } from "./discovery.service";

@Controller("products")
@UseGuards(SessionGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /** Enqueues a SERP discovery job for the given product. Returns the job ID. */
  @Post(":id/discover")
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerDiscovery(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ): Promise<{ jobId: string; status: "queued" }> {
    const { jobId } = await this.discoveryService.enqueueForProduct(id, user.id);
    return { jobId, status: "queued" };
  }
}
