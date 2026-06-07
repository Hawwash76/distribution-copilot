# Distribution Copilot

> Find relevant online conversations (Reddit, X, …) and generate context-aware replies.

This repository is the **monorepo foundation** for Distribution Copilot. It is
intentionally scaffolding only — architecture, configuration, and empty
placeholders that the AI agents, opportunity scoring, community intelligence,
reply generation, and risk-analysis systems will be built on top of.

> [!NOTE]
> No business logic, AI, or scraping is implemented yet. Everything here is
> structure and configuration designed for clean, scalable extension.

## Stack

| Area            | Technology                                                            |
| --------------- | --------------------------------------------------------------------- |
| Monorepo        | [Turborepo](https://turbo.build) + [pnpm workspaces](https://pnpm.io) |
| Frontend        | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui             |
| Frontend state  | TanStack Query, Zustand, TanStack Table                               |
| Backend         | NestJS                                                                |
| API contract    | REST (NestJS controllers) + Zod                                       |
| Database        | PostgreSQL + pgvector, Prisma                                         |
| Background jobs | BullMQ + Redis                                                        |
| Auth            | Better Auth                                                           |
| Validation      | Zod (shared schemas)                                                  |
| Monitoring      | Sentry, PostHog                                                       |
| Tooling         | ESLint (strict), Prettier, TypeScript (strict), Husky, lint-staged    |

## Monorepo structure

```
distribution-copilot/
├── apps/
│   ├── web/        Next.js frontend (App Router) — dashboard placeholder
│   ├── api/        NestJS backend — AppModule + /health
│   └── worker/     BullMQ worker scaffold — Redis config only
│
├── packages/
│   ├── ui/         Shared UI components (shadcn/ui initialized, cn helper)
│   ├── database/   Prisma client wrapper (schema lives at /prisma)
│   ├── shared/     Shared types, Zod schemas, and utilities
│   ├── ai/         AI prompt folder structure (no logic)
│   └── config/     Shared runtime config (app constants, env schema)
│
├── tooling/
│   ├── eslint/     Shared strict ESLint flat configs (base/node/nest/next)
│   ├── typescript/ Shared tsconfig presets (base/node/nestjs/nextjs/react)
│   └── prettier/   Shared Prettier config
│
├── prisma/
│   └── schema.prisma   Base schema (User + Product placeholders, pgvector)
│
├── turbo.json          Turborepo task pipeline
├── pnpm-workspace.yaml  Workspace definition
└── package.json         Root scripts + dev tooling
```

### Why `tooling/` **and** `packages/config/`?

They serve different concerns:

- **`tooling/`** holds _build-time_ configuration packages — ESLint, TypeScript,
  and Prettier presets shared across every workspace.
- **`packages/config/`** holds _runtime_ shared configuration — application
  constants and the environment-variable schema.

## Package naming & dependencies

All workspace packages are namespaced `@distribution-copilot/*` and referenced
internally with the `workspace:*` protocol. Internal libraries are compiled with
`tsc` to `dist/`, so Turborepo's `^build` ordering guarantees dependencies are
built before their consumers.

## Getting started

### Prerequisites

- Node.js `>= 20` (see [`.nvmrc`](.nvmrc) — Node 22)
- pnpm `>= 10`
- PostgreSQL with the `pgvector` extension (for the database) and Redis (for the
  worker) — only needed once those services are actually used.

### Install

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
# then copy the per-app templates as needed:
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

### Generate the Prisma client

```bash
pnpm db:generate
```

### Develop

```bash
pnpm dev
```

Turborepo builds internal packages, then starts the dev servers:

- web → http://localhost:3000
- api → http://localhost:4000 (`GET /health` → `{ "status": "ok" }`)
- worker → logs that it started (no queues registered)

### Build / lint / type-check

```bash
pnpm build       # build every app and package
pnpm lint        # strict ESLint across the monorepo
pnpm type-check  # TypeScript in strict mode, no emit
pnpm format      # Prettier write
```

### Database scripts

```bash
pnpm db:generate   # generate the Prisma client
pnpm db:push       # push schema to the database (no migration history)
pnpm db:migrate    # create + apply a dev migration
pnpm db:studio     # open Prisma Studio
```

## Conventions

- **TypeScript everywhere**, strict mode on (`noUncheckedIndexedAccess`,
  `noUnusedLocals`, …).
- **Single source of truth for types** — domain types are inferred from Zod
  schemas in `@distribution-copilot/shared`.
- **Typed REST contract** — request/response shapes are shared Zod schemas in
  `@distribution-copilot/shared`; the NestJS API exposes them and the web parses with them.
- **Separation of concerns** — server data via TanStack Query, ephemeral UI
  state via Zustand.

## Roadmap (not implemented)

The architecture is prepared for — but does not yet contain — AI agents,
opportunity scoring, community intelligence, reply generation, risk analysis,
and the scraping/discovery pipelines. These land in `packages/ai`,
`apps/api` modules (controllers/services/repositories), and `apps/worker` queues.
