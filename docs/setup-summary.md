# Setup Checkpoint – 2025-11-17

## What was done
- Cloned the Documenso OSS repo into this project, tracked by `case-study` on top of `upstream/main` so we stay close to upstream.
- Installed all workspace deps with `npm install` (npm chosen because `package-lock.json` is present) and documented the dev workflow in `DEV_NOTES.md`.
- Created `.env` with sensible localhost defaults plus TODO placeholders for Stripe, Resend, OAuth, etc. so the dev server can boot without secrets.
- Ran Prisma migrations against a local Postgres instance on port 54320 (stood up via Homebrew since Docker wasn’t available) so the Remix app has schema.
- Verified the main product (`npm run dev` → http://localhost:3000) and the marketing/docs site (`npm run dev:docs` → http://localhost:3002) both boot and render in dev mode.
- Added plan/billing plumbing: Prisma schema fields for plans, helper modules, Stripe checkout/webhook routes, server-side gating on document creation, team invite limits, and a Plan & Billing section in team settings wired to `/api/billing/checkout`.
- Hardened Stripe test-mode flows (checkout, webhook, billing portal), layered upgrade CTAs across upload flows, and rebranded both the docs site and in-app chrome to Dollar DocSign.

## Known gaps / TODOs
- Docker-based `npm run dx` flow still assumes Docker Desktop is running; start it or keep using the Homebrew Postgres fallback described in DEV_NOTES.
- Stripe is still in test-mode with placeholder price IDs—need to wire real keys + finish the upgrade UX (billing portal, success messaging).
- Email (Resend/SMTP) + OAuth integrations are disabled until keys are supplied; expect no outbound mail.
- Marketing site still mirrors upstream Documenso content; needs Signmate branding + pricing copy when we tackle the next milestone.
- Some marketing copy still references Documenso inside docs/settings—do a second pass once the brand narrative is final, and polish the CTA routing when prod URLs are known.

## Next up
1. Hook up production Stripe keys/price IDs + billing portal return URLs, then QA the checkout/webhook flow end-to-end.
2. Polish plan-gated UX (per-plan dashboards, in-app copy, email notifications) and wire up Resend + OAuth providers.
3. Finish scrubbing any remaining Documenso-specific references (legal copy, docs) once final branding assets land.
