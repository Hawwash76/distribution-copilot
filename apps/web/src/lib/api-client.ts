/**
 * Typed REST client for the NestJS API.
 *
 * The web app talks to the API over plain HTTP/JSON — there is no runtime
 * coupling to the backend. The shared contract is the set of Zod schemas in
 * `@distribution-copilot/shared`: callers `parse` responses with the relevant
 * schema, so `apiFetch` returns `unknown` rather than an unchecked cast.
 *
 * Wrap feature access in a `features/<feature>/hooks/use-*.ts` hook that calls
 * `apiFetch` inside TanStack Query and parses the result with a shared schema.
 */

/** Base URL of the API service; only non-secret config belongs in NEXT_PUBLIC_*. */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Error thrown when the API responds with a non-2xx status. Carries the HTTP
 * `status` so the UI can map it to UX (401 → sign-in, 429 → backoff, …).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch JSON from the API. Returns `unknown` — validate the body with the
 * relevant `@distribution-copilot/shared` schema at the call site.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // Required for cross-origin requests so the session cookie is sent to the API.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API request to ${path} failed (${String(response.status)})`,
    );
  }

  if (response.status === 204) return undefined;

  return response.json();
}
