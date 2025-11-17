# Billing Notes

This fork wires a custom Starter/Pro billing system on top of Documenso CE. The key pieces live in the community packages so we can iterate without touching any `packages/ee/*` code.

## Schema & plan fields
- `packages/prisma/schema.prisma`
  - `PlanType` enum (`FREE`, `STARTER`, `PRO`).
  - `User`: `plan`, `stripeCustomerId`, `stripeSubscriptionId`, `planValidUntil`, `totalDocumentsUsed`.
  - `Team`: same plan/subscription fields (team plans are PRO-only for now).
- Migration: `packages/prisma/migrations/*add-plan-billing-fields*/migration.sql` adds the enum + columns.

## Plan helpers & enforcement
- Limits constants + shared types live in `packages/lib/universal/billing/plans.ts`.
- Server-side helpers (`getPlanForUser`, `canCreateEnvelope`, `incrementUsageCountersOnEnvelopeCreated`, `getPlanUsageSummary`) are in `packages/lib/server-only/billing/plan-limits.ts`.
- Envelope creation paths (`packages/lib/server-only/envelope/create-envelope.ts` and `packages/lib/server-only/template/create-document-from-template.ts`) call `canCreateEnvelope` before persisting and bump `totalDocumentsUsed` for free users.
- Team member invites (`packages/trpc/server/team-router/create-team-members.ts`) now require a PRO plan and enforce the 5 member cap.

## Stripe integration
- All Stripe code lives in `packages/lib/server-only/billing/stripe.ts` (uses the existing Stripe SDK helper but no EE modules).
  - Checkout helpers: `createCheckoutSessionForUserStarter`, `createCheckoutSessionForTeamPro`.
  - Webhook handler: `handleStripeWebhook`, `syncSubscription`, `downgrade*` helpers.
- API routes:
  - `apps/remix/app/routes/api+/billing.checkout.ts` – POST `{ plan: 'STARTER' | 'PRO', teamId? }` → checkout URL.
  - `apps/remix/app/routes/api+/billing.webhook.ts` – Stripe webhooks (also mirrored in `/api/stripe/webhook`).
- Required env vars (see `.env`): `NEXT_PRIVATE_STRIPE_API_KEY`, `NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET`, `NEXT_PRIVATE_STRIPE_STARTER_PRICE_ID`, `NEXT_PRIVATE_STRIPE_PRO_PRICE_ID`.

## Plan usage API & UI
- API: `apps/remix/app/routes/api+/limits.tsx` returns `PlanUsageSummary` (current plan, usage, limits) after validating team access.
- Client provider: `packages/lib/client-only/providers/plan-limits.tsx` fetches `/api/limits?teamId=…` and exposes `useLimits()`.
- UI surface: `apps/remix/app/components/general/plan-billing-section.tsx` renders the “Plan & Billing” card in team settings (`apps/remix/app/routes/_authenticated+/t.$teamUrl+/settings._index.tsx`) with upgrade buttons wired to `/api/billing/checkout`.

## Testing locally
1. Ensure Postgres is running (`pg_ctl … start`) and run `npm run prisma:migrate-dev` if schema changed.
2. Set fake Stripe env vars in `.env` (you can use Stripe test keys + price IDs).
3. Start the app: `npm run dev` (main UI) and `npm run dev:docs` (marketing site).
4. Hit `/t/<team>/settings` to see the Plan card; upgrade buttons will POST to `/api/billing/checkout` and redirect to Stripe.
5. Use `stripe listen --forward-to localhost:3000/api/billing/webhook` with your test secret to simulate webhook events; successful subscription events should flip `User.plan`/`Team.plan` and unlock higher limits.
6. To verify gating, create documents until limits are exceeded; errors bubble up as `AppErrorCode.LIMIT_EXCEEDED` with upgrade messaging.
