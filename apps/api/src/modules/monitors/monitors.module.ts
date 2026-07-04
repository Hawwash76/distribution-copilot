import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { BillingModule } from "../billing/billing.module";
import { MonitorsController } from "./monitors.controller";
import { MonitorsRepository } from "./monitors.repository";
import { MonitorsService } from "./monitors.service";

@Module({
  imports: [BillingModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsRepository, PrismaService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
