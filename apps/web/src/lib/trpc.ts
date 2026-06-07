import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@distribution-copilot/trpc";

/**
 * Typed tRPC React client. `AppRouter` is imported as a *type* from the shared
 * tRPC package, giving end-to-end type safety with zero runtime coupling.
 */
export const trpc = createTRPCReact<AppRouter>();
