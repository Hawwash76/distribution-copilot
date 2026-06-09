/**
 * Domain types. These are inferred from the zod schemas so the schema stays
 * the single source of truth. Import types from here when no runtime
 * validation is needed.
 */
export type { User, UpdateAccountInput, ChangePasswordInput } from "../schemas/user";
export type { Product, CreateProductInput, UpdateProductInput } from "../schemas/product";
export type {
  Opportunity,
  OpportunitySource,
  OpportunityStatus,
  UpdateOpportunityStatusInput,
} from "../schemas/opportunity";

/** Generic, transport-agnostic paginated result wrapper. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
