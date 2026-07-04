import { Inject, Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import {
  type CreateProductInput,
  type GeneratedProductProfile,
  type UpdateProductInput,
  type UpdateProductAlertsInput,
  type Product,
  type ProductProfile,
} from "@distribution-copilot/shared";
import { generateProductProfile, type Provider } from "@distribution-copilot/ai";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import for constructor token metadata
import { ProductsRepository } from "./products.repository";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { DiscoveryService } from "../discovery/discovery.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI requires value import
import { MonitorsService } from "../monitors/monitors.service";

/** Days of history to backfill via discovery every time a profile is saved. */
const BACKFILL_DAYS = 90;

/** Business logic for product management. All operations are scoped to the authenticated user. */
@Injectable()
export class ProductsService {
  constructor(
    private readonly products: ProductsRepository,
    @Inject("AI_PROVIDER") private readonly aiProvider: Provider,
    private readonly discovery: DiscoveryService,
    private readonly monitors: MonitorsService,
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
    await this.products.delete(id, userId);
  }

  async saveProfileManually(
    id: string,
    userId: string,
    input: GeneratedProductProfile,
  ): Promise<ProductProfile> {
    await this.findOne(id, userId);
    const profile = await this.products.saveProfile(id, input, "manual");
    await this.startBackfillAndListening(id, userId);
    return profile;
  }

  async generateProfile(id: string, userId: string): Promise<ProductProfile> {
    const product = await this.findOne(id, userId);
    const { profile, model } = await generateProductProfile(product, this.aiProvider);
    const saved = await this.products.saveProfile(id, profile, model);
    await this.startBackfillAndListening(id, userId);
    return saved;
  }

  /**
   * Kicks off a one-time ~90-day backfill discovery run and enables ongoing
   * monitoring for a product right after its profile is (re)saved. A discovery
   * job already in flight for this product is treated as a benign no-op — an
   * automatic trigger should never fail profile saving over "already running,"
   * unlike the manual "Discover" button which surfaces that as a real conflict.
   */
  private async startBackfillAndListening(productId: string, userId: string): Promise<void> {
    const since = new Date(Date.now() - BACKFILL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    try {
      await this.discovery.enqueueForProduct(productId, userId, undefined, since);
    } catch (err) {
      if (!(err instanceof ConflictException)) throw err;
    }
    await this.monitors.enableAllForProduct(productId);
  }

  async getProfile(id: string, userId: string): Promise<ProductProfile> {
    await this.findOne(id, userId);
    const profile = await this.products.findProfile(id);
    if (!profile) throw new NotFoundException(`No profile generated yet for product ${id}`);
    return profile;
  }

  async updateAlerts(
    id: string,
    userId: string,
    input: UpdateProductAlertsInput,
  ): Promise<Product> {
    await this.findOne(id, userId);
    return this.products.updateAlerts(id, userId, input);
  }
}
