# tRPC host (placeholder)

The API service is the intended host for the shared tRPC router
(`@distribution-copilot/trpc`). When endpoints exist, mount the router here as
an Express middleware, e.g. at `/trpc`:

```ts
// trpc.middleware.ts (future)
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "@distribution-copilot/trpc";

export const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});
```

No middleware is wired up yet — the router is empty.
