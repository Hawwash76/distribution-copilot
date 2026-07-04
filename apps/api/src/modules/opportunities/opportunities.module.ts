import { Module } from "@nestjs/common";
import { createProvider } from "@distribution-copilot/ai";

import { PrismaService } from "../../common/prisma.service";
import { BillingModule } from "../billing/billing.module";
import { ProductsModule } from "../products/products.module";
import { OpportunitiesController } from "./opportunities.controller";
import { OpportunitiesRepository } from "./opportunities.repository";
import { OpportunitiesService } from "./opportunities.service";

@Module({
  imports: [ProductsModule, BillingModule],
  controllers: [OpportunitiesController],
  providers: [
    OpportunitiesService,
    OpportunitiesRepository,
    PrismaService,
    {
      provide: "AI_PROVIDER",
      useValue: createProvider(),
    },
  ],
})
export class OpportunitiesModule {}
