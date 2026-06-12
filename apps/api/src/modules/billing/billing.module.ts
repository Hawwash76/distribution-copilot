import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { BillingController } from "./billing.controller";
import { BillingRepository } from "./billing.repository";
import { BillingService } from "./billing.service";

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, PrismaService],
  exports: [BillingService],
})
export class BillingModule {}
