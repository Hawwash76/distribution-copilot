import { Module } from "@nestjs/common";

import { PrismaService } from "../../common/prisma.service";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository, PrismaService],
})
export class ProductsModule {}
