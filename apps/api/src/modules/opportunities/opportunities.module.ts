import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { ProductsModule } from "../products/products.module";
import { OpportunitiesController } from "./opportunities.controller";
import { OpportunitiesRepository } from "./opportunities.repository";
import { OpportunitiesService } from "./opportunities.service";

@Module({
  imports: [ProductsModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, OpportunitiesRepository, PrismaService],
})
export class OpportunitiesModule {}
