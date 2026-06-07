/**
 * tRPC request context (placeholder).
 *
 * Real implementations will attach the authenticated session, the Prisma
 * client, and any per-request services here. For now it returns an empty
 * object so the router type-checks.
 */
export interface CreateContextOptions {
  // e.g. headers, req, res — added when the API host is wired up.
  headers?: Headers;
}

export function createContext(_opts: CreateContextOptions = {}) {
  return {};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
