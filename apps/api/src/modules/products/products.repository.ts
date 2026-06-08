import { Injectable } from "@nestjs/common";
import {
  type CreateProductInput,
  type UpdateProductInput,
  type Product,
} from "@distribution-copilot/shared";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { PrismaService } from "../../common/prisma.service";

/**
 * All Prisma access for the products feature.
 * Every query is scoped to the owning userId.
 */
@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<Product[]> {
    const rows = await this.prisma.db.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(this.toProduct);
  }

  async findOneByUser(id: string, userId: string): Promise<Product | null> {
    const row = await this.prisma.db.product.findFirst({ where: { id, userId } });
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

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.db.product.delete({ where: { id, userId } });
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
    };
  }
}
