import { initTRPC } from "@trpc/server";

import type { Context } from "./context";

/**
 * tRPC instance + reusable building blocks. Procedures and middleware are
 * defined from these. No procedures exist yet.
 */
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
export const mergeRouters = t.mergeRouters;
