import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { StatsController } from "./stats.controller";
import { StatsRepository } from "./stats.repository";
import { StatsService } from "./stats.service";

@Module({
  controllers: [StatsController],
  providers: [StatsService, StatsRepository, PrismaService],
})
export class StatsModule {}
