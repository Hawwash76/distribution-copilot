/**
 * @distribution-copilot/trpc
 *
 * Type-safe API contract shared between the NestJS API (host) and the Next.js
 * web app (client). Exports the root router, its type, the context factory,
 * and the procedure/router builders.
 */
export { appRouter, type AppRouter } from "./root";
export { createContext, type Context, type CreateContextOptions } from "./context";
export { router, middleware, publicProcedure, createCallerFactory, mergeRouters } from "./trpc";
