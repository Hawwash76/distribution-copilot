import { Module } from "@nestjs/common";
import { Queue } from "bullmq";

import { redisConnection } from "./redis-connection.js";
import { DiscoveryController } from "./discovery.controller.js";
import { DiscoveryService } from "./discovery.service.js";
import { PrismaService } from "../../common/prisma.service.js";
import { BillingModule } from "../billing/billing.module.js";

@Module({
  imports: [BillingModule],
  controllers: [DiscoveryController],
  providers: [
    DiscoveryService,
    PrismaService,
    {
      provide: "DISCOVERY_QUEUE",
      useFactory: () => new Queue("discovery", { connection: redisConnection }),
    },
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
