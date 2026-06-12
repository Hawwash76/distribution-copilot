import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { MonitorsController } from "./monitors.controller";
import { MonitorsRepository } from "./monitors.repository";
import { MonitorsService } from "./monitors.service";

@Module({
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsRepository, PrismaService],
})
export class MonitorsModule {}
