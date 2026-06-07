import { router } from "./trpc";

/**
 * The application's root tRPC router (placeholder).
 *
 * Feature routers will be defined under `./routers` and merged here, e.g.:
 *
 *   export const appRouter = router({
 *     opportunity: opportunityRouter,
 *     reply: replyRouter,
 *   });
 *
 * It is intentionally empty for now — no endpoints are defined.
 */
export const appRouter = router({});

/** Exported type used by the frontend tRPC client for end-to-end type safety. */
export type AppRouter = typeof appRouter;
