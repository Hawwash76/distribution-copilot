import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { ResearchController } from "./research.controller";
import { ResearchRepository } from "./research.repository";
import { ResearchService } from "./research.service";

@Module({
  controllers: [ResearchController],
  providers: [ResearchService, ResearchRepository, PrismaService],
})
export class ResearchModule {}
