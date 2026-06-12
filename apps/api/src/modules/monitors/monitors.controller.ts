import { Controller, Get, Param, Patch, Body, UseGuards } from "@nestjs/common";
import { type MonitorStatus, toggleMonitorInputSchema } from "@distribution-copilot/shared";

import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { MonitorsService } from "./monitors.service";

/**
 * Monitoring toggle endpoints — per-source discovery control per product.
 *
 * GET  /products/:id/monitors         → list all 6 sources with enabled + lastCheckedAt
 * PATCH /products/:id/monitors/:source → toggle { enabled: boolean }
 */
@UseGuards(SessionGuard)
@Controller("products/:id/monitors")
export class MonitorsController {
  constructor(private readonly service: MonitorsService) {}

  @Get()
  async list(
    @Param("id") productId: string,
    @CurrentUser() user: { id: string },
  ): Promise<MonitorStatus[]> {
    return this.service.listForProduct(productId, user.id);
  }

  @Patch(":source")
  async toggle(
    @Param("id") productId: string,
    @Param("source") source: string,
    @Body() body: unknown,
    @CurrentUser() user: { id: string },
  ): Promise<MonitorStatus> {
    const { enabled } = toggleMonitorInputSchema.parse(body);
    return this.service.toggle(productId, source, enabled, user.id);
  }
}
