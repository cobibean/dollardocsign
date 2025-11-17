# DEV_NOTES

## Monorepo layout
- `apps/remix`: Remix/Hono app that powers the full Documenso product (our main SaaS surface area).
- `apps/documentation`: Marketing + docs site built with Next.js/Nextra; use this as the cloned marketing site.
- `apps/openpage-api`: Ancillary API for OpenPage embeds; leave as-is for now unless you need embed previews.
- `packages/*`: Shared config, UI kit, Prisma schema, etc. Consume them rather than duplicating logic.

## Environment + dependencies
1. Copy `.env.example` to `.env` (already done) and adjust secrets as needed. Use `.env.local` for overrides if you want to keep `.env` close to upstream defaults.
2. `npm install` at the repo root (npm is required because a `package-lock.json` is checked in).
3. Local services live under `docker/development/compose.yml`:
   - Postgres 15 on `localhost:54320` (`documenso/password`).
   - Inbucket mail server on http://localhost:9000 (SMTP on port 2500).
   - MinIO S3-compatible storage on http://localhost:9001 (API on 9002).

## Dev workflow
1. Boot infrastructure: `npm run dx:up` (or the full `npm run dx` to install deps, start Docker, run migrations, and seed demo data).
2. Run Prisma migrations: `npm run prisma:migrate-dev`. Add `npm run prisma:seed` if you need demo content (already part of `npm run dx`).
3. Start the main app (Remix): `npm run dev` (turbo filters to `@documenso/remix` on port 3000).
4. Start the marketing site: `npm run dev:docs` (Next.js dev server on port 3002). Run it in a second terminal so both apps are live for QA.
5. Optional helper: `npm run d` wraps `npm run dx`, `npm run translate:compile`, and `npm run dev` for a one-command DX experience once Docker is running.
6. Shut down local infra with `npm run dx:down` when finished.

## Services + integrations to revisit
- Stripe billing + plan enforcement: blocked until we implement the PRD plan logic.
- Google login, Resend, and other SaaS credentials are stubbed in `.env` with TODOs.
- Railway deploy target: once infra is provisioned, update the `.env` to point to managed Postgres/S3/Resend per PRD guidance.

## Billing entry points
- Shared plan constants are in `packages/lib/universal/billing/plans.ts`.
- Server helpers (`canCreateEnvelope`, `getPlanUsageSummary`, etc.) live in `packages/lib/server-only/billing`.
- Checkout/webhook routes are exposed at `/api/billing/checkout` and `/api/billing/webhook` (see `apps/remix/app/routes/api+/`).
- The Remix client consumes plan usage via `useLimits` from `packages/lib/client-only/providers/plan-limits.tsx`.

## Dockerless local fallback
If Docker Desktop is unavailable (e.g., CI or a Mac user without Docker running), you can still boot Postgres locally to keep the dev server happy:

```bash
# Start PostgreSQL 15 on port 54320
LC_ALL="en_US.UTF-8" /opt/homebrew/opt/postgresql@15/bin/pg_ctl \
  -D /opt/homebrew/var/postgresql@15 \
  -l /tmp/postgresql15.log \
  -o "-p 54320" start

# Stop it again when done
LC_ALL="en_US.UTF-8" /opt/homebrew/opt/postgresql@15/bin/pg_ctl \
  -D /opt/homebrew/var/postgresql@15 \
  -o "-p 54320" stop
```

Create the `documenso` role/database exactly once:

```bash
/opt/homebrew/opt/postgresql@15/bin/psql -p 54320 -d postgres -c "CREATE ROLE documenso LOGIN PASSWORD 'password' CREATEDB" 2>/dev/null || true
/opt/homebrew/opt/postgresql@15/bin/psql -p 54320 -d postgres <<'SQL'
SELECT 'CREATE DATABASE documenso OWNER documenso'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='documenso')
\gexec
SQL
```

This mirrors what `npm run dx` would provision through Docker so `npm run dev` works even without the containers.
