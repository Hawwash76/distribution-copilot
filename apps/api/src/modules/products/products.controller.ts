import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type Product,
  type ProductProfile,
  type UpdateProductInput,
} from "@distribution-copilot/shared";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { SessionGuard } from "../auth/session.guard";
import { CurrentUser } from "../auth/session.decorator";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsService } from "./products.service";

@Controller("products")
@UseGuards(SessionGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string }): Promise<Product[]> {
    return this.productsService.findAll(user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: { id: string }): Promise<Product> {
    return this.productsService.findOne(id, user.id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductInput,
    @CurrentUser() user: { id: string },
  ): Promise<Product> {
    return this.productsService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductInput,
    @CurrentUser() user: { id: string },
  ): Promise<Product> {
    return this.productsService.update(id, user.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param("id") id: string, @CurrentUser() user: { id: string }): Promise<void> {
    return this.productsService.delete(id, user.id);
  }

  @Post(":id/generate-profile")
  generateProfile(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ProductProfile> {
    return this.productsService.generateProfile(id, user.id);
  }

  @Get(":id/profile")
  getProfile(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ProductProfile> {
    return this.productsService.getProfile(id, user.id);
  }
}
