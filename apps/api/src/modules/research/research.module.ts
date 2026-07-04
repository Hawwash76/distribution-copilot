import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { BillingModule } from "../billing/billing.module";
import { ResearchController } from "./research.controller";
import { ResearchRepository } from "./research.repository";
import { ResearchService } from "./research.service";

@Module({
  imports: [BillingModule],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchRepository, PrismaService],
})
export class ResearchModule {}
