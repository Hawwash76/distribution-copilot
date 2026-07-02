import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { ProductsModule } from "../products/products.module";
import { CompetitorMonitorController } from "./competitor-monitor.controller";
import { CompetitorMonitorRepository } from "./competitor-monitor.repository";
import { CompetitorMonitorService } from "./competitor-monitor.service";

@Module({
  imports: [ProductsModule],
  controllers: [CompetitorMonitorController],
  providers: [CompetitorMonitorService, CompetitorMonitorRepository, PrismaService],
})
export class CompetitorMonitorModule {}
