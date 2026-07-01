This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Politicians Tracker

A local, JSON-backed database and dashboard for public **New Zealand political
data** (MPs, bills, and voting records), built for data analysis.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **Tailwind CSS 4** + **shadcn/ui** (new-york) design system
- **Biome** for linting and formatting
- **Jest** + Testing Library for unit tests
- **Husky** + lint-staged pre-commit hooks (Biome, `tsc`, tests)
- **Motion** for animation, plus a raw-WebGL GLSL shader background
- **tsx** data-collection scripts writing normalized JSON to `data/`

## Getting started

```bash
pnpm install
pnpm data:collect all   # populate ./data with fresh JSON
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data collection

Collectors fetch public NZ political data, normalize it to a canonical schema,
and write JSON into `data/`. Every record carries `sourceUrl` and `fetchedAt`
provenance. Responses are cached under `.cache/` (git-ignored) with polite rate
limiting.

```bash
pnpm data:collect all         # run every collector
pnpm data:collect mps         # MPs & metadata
pnpm data:collect bills       # bills with recorded votes
pnpm data:collect votes       # division (vote) summaries
pnpm data:collect expenses    # MP expenses (best-effort)
pnpm data:collect ministers   # minister expenses (best-effort)
pnpm data:collect mps --force # bypass the cache
```

Primary source: [voted.nz](https://voted.nz) (CC-BY 4.0), based on Office of the
Clerk / Parliamentary Service data. MP/minister expense sources
(parliament.nz, dia.govt.nz) are behind bot challenges, so those collectors are
best-effort and degrade to an empty dataset with a warning.

### Adding a collector

1. Create `scripts/collect/<domain>.ts` exporting a `Collector` (see
   `scripts/collect/mps.ts`).
2. Register it in `scripts/collect/index.ts`.
3. Add the domain to the `Domain` union in `src/types/records.ts`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format (write) |
| `pnpm check` | Biome lint + format check |
| `pnpm check:fix` | Biome lint + format (write) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Run Jest |
| `pnpm data:collect` | Run data collectors |


