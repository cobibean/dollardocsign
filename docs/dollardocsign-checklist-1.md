# Dollar Docusign 

## Checklist: 
- Legal / licensing
    - I’m okay with AGPL + making my fork public.
    - I will not use any code from /packages/ee or other EE features without a license.
    - New brand name: Dollar Doc Sign or Dollar Docusign.

- Product
    - Niche: ________ (e.g. NDAs for founders).
    - Features included: upload → fields → send → sign → download.
    - Features hidden/disabled for v1: teams, API, webhooks, advanced templates.

- Pricing
    - Single plan: $1/mo.
    - Limit: 5 documents/month per user.
    - Behavior on limit reached: block + upgrade CTA.

- Infra
    - Host on: Render / Railway.
    - Postgres: provider’s managed DB.
    - Storage: S3 (Cloudflare R2).
    - Email: Resend.
    - Env options: UPLOAD_TRANSPORT = s3, SMTP_TRANSPORT = resend, SIGNING_TRANSPORT = local, JOBS_PROVIDER = local.

- Stripe
    - New Stripe Product + Price = $1/mo.
    - Use Checkout Sessions for subscription creation.
    - Webhook: on checkout.session.completed → set user.plan = basic.
    - Store stripe_customer_id and stripe_subscription_id on User.

- UX / UI
    - Remove extra menu items and teams.
    - Replace branding and wording to match the niche.
    - Seed 1–2 NDA/contract templates.

- Data & Legal
    - Retention window: 90 days.
    - ToS + Privacy pages written and linked in footer.
    - Clear disclaimer about no legal advice / no guarantees.

- Dev / Cursor
    - Keep monorepo; don’t flatten.
    - Local DX with Docker (npm run dx).
    - Use Cursor to scaffold Stripe + plan logic + UI changes.
    - Keep an upstream-mirror branch for clean diffs.

Growth
- Primary channel: X / LinkedIn / Newsletter (pick one).
- Analytics tool: Plausible / Posthog.
- Simple landing → checkout → app funnel defined.