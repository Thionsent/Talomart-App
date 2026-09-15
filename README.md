# Talomart Stores Platform

Production-oriented e-commerce platform for Talomart Stores, built as a TypeScript modular monorepo.

The original interactive HTML prototype remains in the workspace root:

- `index.html`
- `styles.css`
- `script.js`

The production application lives under `apps/` and `packages/`.

## Repository structure

```text
.
├── apps/
│   ├── web/                 Next.js storefront, account, checkout and admin routes
│   └── worker/              Optional background worker for async jobs
├── packages/
│   ├── db/                  Supabase PostgreSQL schema, client, migrations and seed data
│   └── ui/                  Shared Talomart UI components
├── infra/                   Optional Docker fallback for local infrastructure
├── docs/                    Architecture, security and setup documentation
├── .github/workflows/       Continuous integration
├── .env.example             Required configuration template
└── package.json             npm workspaces and root scripts
```

## Production direction

Talomart uses Supabase PostgreSQL as the source of truth for:

- products, categories and product images metadata
- customers, staff users and sessions
- carts, checkout sessions and wishlists
- orders, order items and delivery details
- payments and checkout callback references
- inventory balances and movement history

The storefront can load catalogue data from Supabase when `DATABASE_URL` is configured. During early local development, it falls back to the demo catalogue so the UI remains usable before credentials are added.

## Prerequisites

- Node.js 24 or newer
- npm 11 or newer
- Git
- Supabase project for managed PostgreSQL

Docker is not required for the main setup. The Docker files remain only as an optional local fallback.

## First-time setup

```powershell
Copy-Item .env.example .env
npm install
```

Create a Supabase project, then update `.env` with the connection strings from Supabase Dashboard -> Connect:

- `DATABASE_URL`: Shared Pooler transaction mode, usually port `6543`
- `DATABASE_DIRECT_URL`: Direct connection or Shared Pooler session mode, usually port `5432`

Then apply the schema and load starter catalogue data:

```powershell
npm run db:setup
npm run db:check
npm run dev
```

Open `http://localhost:3000`.

See [docs/supabase-setup.md](docs/supabase-setup.md) for the detailed Supabase setup checklist.
Use the [configuration and security runbook](docs/configuration-security-runbook.md)
for environment promotion, credential rotation, MFA, staff permissions, audit
verification and dependency-security release gates.

Before enabling real customer orders, work through the
[market-readiness roadmap](docs/market-readiness-roadmap.md). It records the
security, payment, operations, compliance and release gates for the controlled
pilot and public launch.

For payment testing, start with the
[M-Pesa sandbox guide](docs/mpesa-sandbox-testing.md) and verify credentials
with `npm run mpesa:sandbox:check` before placing a sandbox checkout.

## Optional background processing

The worker app is ready for payment and notification jobs, but it is optional until those async flows are introduced.

```powershell
npm run dev:worker
```

If BullMQ is used locally, configure `REDIS_URL`. For a Supabase-first path, Supabase Queues can replace Redis-backed jobs later.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

## Important commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js application |
| `npm run dev:worker` | Start optional payment and notification workers |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run db:migrate` | Apply committed migrations to Supabase PostgreSQL |
| `npm run db:seed` | Load or refresh the starter Talomart catalogue |
| `npm run db:setup` | Apply migrations and seed the catalogue |
| `npm run db:check` | Verify PostgreSQL connectivity and core table counts |
| `npm run db:studio` | Open the database browser |
| `npm run infra:up` | Optional: start local PostgreSQL and Redis in Docker |
| `npm run infra:status` | Optional: show Docker service health |
| `npm run build` | Produce production builds |

Never commit `.env`, production credentials, Supabase service-role keys, M-Pesa secrets or database backups.
