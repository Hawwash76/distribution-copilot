import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { DiscoveryService } from "./discovery.service";
import { triggerDiscoverySchema, type TriggerDiscoveryInput } from "./dto/trigger-discovery.input";

@Controller("products")
@UseGuards(SessionGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /** Enqueue a Reddit discovery job for the given product. Returns the job ID. */
  @Post(":id/discover")
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerDiscovery(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(triggerDiscoverySchema)) dto: TriggerDiscoveryInput,
    @CurrentUser() user: { id: string },
  ): Promise<{ jobId: string; status: "queued" }> {
    const { jobId } = await this.discoveryService.enqueueForProduct(id, user.id, dto);
    return { jobId, status: "queued" };
  }
}
