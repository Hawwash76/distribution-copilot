/**
 * Domain types. These are inferred from the zod schemas so the schema stays
 * the single source of truth. Import types from here when no runtime
 * validation is needed.
 */
export type { User } from "../schemas/user";
export type { Product, CreateProductInput, UpdateProductInput } from "../schemas/product";
export type { Discussion, DiscussionSource } from "../schemas/discussion";
export type { Opportunity, OpportunitySource } from "../schemas/opportunity";

/** Generic, transport-agnostic paginated result wrapper. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
