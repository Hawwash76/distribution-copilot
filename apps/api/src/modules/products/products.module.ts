import { Module } from "@nestjs/common";
import { createMockProvider } from "@distribution-copilot/ai";

import { PrismaService } from "../../common/prisma.service";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository,
    PrismaService,
    {
      provide: "AI_PROVIDER",
      useValue: createMockProvider(),
    },
  ],
})
export class ProductsModule {}
