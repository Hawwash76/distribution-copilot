/**
 * @distribution-copilot/shared
 *
 * Cross-cutting types, validation schemas, and utilities shared between the
 * web, api, and worker services. Keep this package free of runtime/framework
 * dependencies so it can be imported anywhere.
 */
export * from "./schemas";
export * from "./types";
export * from "./utils";

// Re-export zod so consumers use a single, version-pinned instance.
export { z } from "zod";
