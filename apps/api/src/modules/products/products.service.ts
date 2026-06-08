import { Injectable, NotFoundException } from "@nestjs/common";
import {
  type CreateProductInput,
  type UpdateProductInput,
  type Product,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsRepository } from "./products.repository";

/** Business logic for product management. All operations are scoped to the authenticated user. */
@Injectable()
export class ProductsService {
  constructor(private readonly products: ProductsRepository) {}

  findAll(userId: string): Promise<Product[]> {
    return this.products.findAllByUser(userId);
  }

  async findOne(id: string, userId: string): Promise<Product> {
    const product = await this.products.findOneByUser(id, userId);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  create(userId: string, input: CreateProductInput): Promise<Product> {
    return this.products.create(userId, input);
  }

  async update(id: string, userId: string, input: UpdateProductInput): Promise<Product> {
    await this.findOne(id, userId);
    return this.products.update(id, userId, input);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.products.delete(id, userId);
  }
}
