import { Module } from "@nestjs/common";
import { createProvider } from "@distribution-copilot/ai";

import { PrismaService } from "../../common/prisma.service";
import { BillingModule } from "../billing/billing.module";
import { DiscoveryModule } from "../discovery/discovery.module";
import { MonitorsModule } from "../monitors/monitors.module";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

@Module({
  imports: [BillingModule, DiscoveryModule, MonitorsModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository,
    PrismaService,
    {
      provide: "AI_PROVIDER",
      useValue: createProvider(),
    },
  ],
  exports: [ProductsRepository],
})
export class ProductsModule {}
