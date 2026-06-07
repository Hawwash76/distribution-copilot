# CLAUDE.md — `@distribution-copilot/ui`

Shared, framework-agnostic React UI **primitives** (shadcn/ui + Tailwind). Today it ships
the `cn` helper; generated components are added under `src/components`.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) and
> [`docs/architecture/frontend-architecture.md`](../../docs/architecture/frontend-architecture.md)
> first.

---

## Responsibilities

- Provide **reusable, presentational** UI primitives (buttons, inputs, dialogs, etc.)
  shared across apps.
- Own the `cn()` class-merge helper and the shared style entry (`styles.css`).
- Be a clean component library with **no business logic and no data fetching**.

## Boundaries

**Depends on:** `react`/`react-dom` (peer), `class-variance-authority`, `clsx`,
`tailwind-merge`.

**Must NOT:** import any other workspace package, fetch data, hold app state, contain
business/domain logic, or know about tRPC/Prisma/the domain model.

This package is **presentational and generic.** Anything that knows about opportunities,
scores, or replies is an **app-specific** component and belongs in `apps/web`
(co-located with its feature), not here.

## Folder conventions

```
src/
├── index.ts            # re-exports the public component surface + lib/utils (cn)
├── components/         # shadcn/ui-generated primitives (one per file, kebab-case)
├── lib/utils.ts        # cn() helper
└── styles.css          # shared Tailwind layer (exported as "./styles.css")
```

`components.json` configures shadcn for this package. Component files are `kebab-case.tsx`;
exported identifiers are `PascalCase`.

## Patterns

- **shadcn/ui workflow:** generate primitives into `src/components` (we own the source),
  export them from `index.ts`. We can freely modify generated components — they're our code.
- **Variants via CVA**; conditional classes via `cn()` (clsx + tailwind-merge).
- **Styling with Tailwind tokens** (theme variables), never raw hex; class order is
  auto-sorted by `prettier-plugin-tailwindcss`.
- **Accessible by default** (Radix underneath); keep components controlled/uncontrolled in
  idiomatic shadcn style.
- Consumers import via `@distribution-copilot/ui`; the web app's `components.json` aliases
  `ui` → this package, and imports the stylesheet via `@distribution-copilot/ui/styles.css`.

## Anti-patterns

- Business/domain logic or data fetching in a component (keep it presentational).
- Importing `shared`/`trpc`/`database` or any app.
- Domain-aware components here (e.g. `OpportunityTable`) — those live in `apps/web`.
- Raw colors instead of theme tokens; hand-sorting Tailwind classes.
- A "kitchen-sink" mega-component — keep primitives small and composable.

## Implementation guidance

- **Add a primitive:** run the shadcn generator into `src/components`, export it from
  `index.ts`, restyle with tokens as needed.
- **Decide where a component goes:** generic + reusable + presentational → here;
  domain-aware or app-specific → `apps/web`. When unsure, start in the app and promote to
  `ui` only once a second consumer genuinely needs it (avoid premature sharing).
- Keep the public surface intentional — export from `index.ts`, don't deep-import.

## Commands

```bash
pnpm --filter @distribution-copilot/ui build         # tsc → dist/
pnpm --filter @distribution-copilot/ui type-check
```
