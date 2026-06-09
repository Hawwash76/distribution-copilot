import { Injectable } from "@nestjs/common";
import {
  type CreateProductInput,
  type UpdateProductInput,
  type Product,
  type ProductProfile,
  type GeneratedProductProfile,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for the products feature.
 * Every query is scoped to the owning userId.
 * Products are never hard-deleted — archive() sets archivedAt instead.
 */
@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<Product[]> {
    const rows = await this.prisma.db.product.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(this.toProduct);
  }

  async findOneByUser(id: string, userId: string): Promise<Product | null> {
    const row = await this.prisma.db.product.findFirst({
      where: { id, userId, isDeleted: false },
    });
    return row ? this.toProduct(row) : null;
  }

  async create(userId: string, input: CreateProductInput): Promise<Product> {
    const row = await this.prisma.db.product.create({
      data: { userId, ...input },
    });
    return this.toProduct(row);
  }

  async update(id: string, userId: string, input: UpdateProductInput): Promise<Product> {
    const row = await this.prisma.db.product.update({
      where: { id, userId },
      data: input,
    });
    return this.toProduct(row);
  }

  /** Soft-delete a product by setting isDeleted. */
  async archive(id: string, userId: string): Promise<void> {
    await this.prisma.db.product.update({
      where: { id, userId },
      data: { isDeleted: true },
    });
  }

  /** Stamp the product with the time discovery was last triggered. */
  async updateLastDiscovered(id: string): Promise<void> {
    await this.prisma.db.product.update({
      where: { id },
      data: { lastDiscoveredAt: new Date() },
    });
  }

  async findProfile(productId: string): Promise<ProductProfile | null> {
    const row = await this.prisma.db.productProfile.findUnique({ where: { productId } });
    return row ? this.toProfile(row) : null;
  }

  async saveProfile(
    productId: string,
    data: GeneratedProductProfile,
    model: string,
  ): Promise<ProductProfile> {
    const row = await this.prisma.db.productProfile.upsert({
      where: { productId },
      update: { ...data, modelUsed: model, generatedAt: new Date() },
      create: { productId, ...data, modelUsed: model },
    });
    return this.toProfile(row);
  }

  private toProfile(row: {
    id: string;
    productId: string;
    painPoints: string[];
    personas: string[];
    keywords: string[];
    competitors: string[];
    useCases: string[];
    valueProps: string[];
    modelUsed: string;
    generatedAt: Date;
  }): ProductProfile {
    return {
      id: row.id,
      productId: row.productId,
      painPoints: row.painPoints,
      personas: row.personas,
      keywords: row.keywords,
      competitors: row.competitors,
      useCases: row.useCases,
      valueProps: row.valueProps,
      modelUsed: row.modelUsed,
      generatedAt: row.generatedAt,
    };
  }

  private toProduct(row: {
    id: string;
    userId: string;
    name: string;
    website: string | null;
    description: string | null;
    audience: string | null;
    competitors: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDeleted: boolean;
    lastDiscoveredAt: Date | null;
  }): Product {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      website: row.website,
      description: row.description,
      audience: row.audience,
      competitors: row.competitors,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isDeleted: row.isDeleted,
      lastDiscoveredAt: row.lastDiscoveredAt,
    };
  }
}
