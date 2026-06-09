import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  type CreateProductInput,
  type UpdateProductInput,
  type Product,
  type ProductProfile,
} from "@distribution-copilot/shared";
import { generateProductProfile, type Provider } from "@distribution-copilot/ai";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsRepository } from "./products.repository";

/** Business logic for product management. All operations are scoped to the authenticated user. */
@Injectable()
export class ProductsService {
  constructor(
    private readonly products: ProductsRepository,
    @Inject("AI_PROVIDER") private readonly aiProvider: Provider,
  ) {}

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
    await this.products.archive(id, userId);
  }

  async generateProfile(id: string, userId: string): Promise<ProductProfile> {
    const product = await this.findOne(id, userId);
    const { profile, model } = await generateProductProfile(product, this.aiProvider);
    return this.products.saveProfile(id, profile, model);
  }

  async getProfile(id: string, userId: string): Promise<ProductProfile> {
    await this.findOne(id, userId);
    const profile = await this.products.findProfile(id);
    if (!profile) throw new NotFoundException(`No profile generated yet for product ${id}`);
    return profile;
  }
}
