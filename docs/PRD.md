# PRD – Tiny DocuSign-style SaaS on top of Documenso

**Working name:** Signmate (placeholder – can be renamed later)  
**Owner:** cobi  
**Repo base:** https://github.com/documenso/documenso  
**Last updated:** 2025-11-17  

---

## 1. Overview

We are building a small, opinionated e-signature SaaS as a public case study:

- Clone the open-source Documenso Community Edition (AGPLv3).
- Keep the **full surface area** of the backend and most of the frontend structure (apps, packages, marketing site).
- Add **custom billing and plans**:
  - 5 free documents total (lifetime).
  - $1/mo Starter tier.
  - $11/mo Pro/Teams tier (up to 5 team members).
- Host on **Railway** with managed Postgres, S3-compatible storage, and **Resend** for email.
- Ship something usable, show the full stack, and get **first 10 users in ≤ 2 weeks**.

This is not a long-term “compete with DocuSign” play; it’s a **live experiment** and content asset.

---

## 2. Goals & Success Metrics

### 2.1 Business / Content Goals

- Demonstrate that you can:
  - Fork a serious open-source SaaS.
  - Wire up billing.
  - Ship a working hosted product with minimal spend.
- Use the process as content (threads, videos, posts, newsletter).

### 2.2 Success Metrics (Initial)

By end of week 2:

- **10+ registered users**.
- **≥3 paying users** on $1/mo or $11/mo plans.
- App is stable enough for basic signature flows:
  - Upload → Place fields → Send → Sign → Download signed PDF.

Secondary:

- At least one long-form breakdown/case study is possible using commits and PRDs as supporting artifacts.

---

## 3. Target Users & Use Cases

### 3.1 Primary Persona – Indie Founder / Small Startup

- Needs: quick NDAs, contractor agreements, simple SaaS agreements.
- Pain: DocuSign/Adobe are overkill, heavy, and expensive.
- Wants: easy, fast, cheap, no 2-hour onboarding.

### 3.2 Secondary Persona – Freelancer / Consultant

- Needs: basic contracts signed quickly.
- Cares: clarity, audit trail, easy resend and download.

---

## 4. Scope & Features

We are **not** reinventing Documenso. We are:

- Cloning the **backend & core structure**.
- Modifying configuration, branding, and adding billing + plan gating.

### 4.1 High-Level Feature Areas

1. **Accounts & Auth**
   - Email/password or magic link sign-up/sign-in.
   - Social login via **Google**.
   - Profile management (name, email).
   - Basic account-level settings.

2. **Teams & Roles (from Documenso)**
   - Teams/organizations as per Documenso’s model.
   - Owner and member roles.
   - On Pro/Teams tier, owner can invite up to **5 members** to a team.

3. **Documents & Envelopes**
   - Use Documenso’s `Envelope`/document model.
   - Upload PDF support.
   - Add signature, initials, and text fields.
   - Save, send to signer(s), track status.
   - Signed PDF + audit trail accessible.

4. **Signing Experience**
   - Email link to signer with secure token.
   - Signer can review, sign, download.
   - Simple, mobile-friendly UI.

5. **Templates**
   - Support Documenso’s template model.
   - Provide **starter templates**:
     - NDA (mutual).
     - Contractor agreement.
   - Users on paid tiers can create and reuse their own templates.

6. **Billing & Plans (Custom)**
   - Our own EE-style billing logic (no use of Documenso EE code).
   - Stripe-based subscription + usage limits.
   - Plan gating for features and document counts.

7. **Marketing Site**
   - Clone the marketing site app from the Documenso repo.
   - Rebrand:
     - Product name.
     - Value prop.
     - Pricing section reflecting our tiers.
   - Keep it simple but hooked into the main app login/signup.

8. **Admin / Ops**
   - Minimal internal view/logs for:
     - User count.
     - Plan distribution.
     - Basic envelope usage stats.
   - Could be simple Prisma queries via script or a basic admin page protected by env-based admin email.

---

## 5. Plans & Pricing

### 5.1 Plan Overview

**Free** (no card required):
- **Limit:** 5 documents total (lifetime), across all teams.
- 1 user, no teams/advanced sharing.
- Includes:
  - Upload + sign flow.
  - Access to built-in templates (maybe locked to 1–2).
- Once limit reached:
  - Hard block on new envelopes.
  - Clear CTA to upgrade.

**Starter – $1/mo**
- Single user.
- **Document limit:** e.g. 20 documents / month. (Configurable constant.)
- Can use built-in templates and create their own.
- No team invites.
- Basic support.

**Pro/Teams – $11/mo**
- Team-based subscription.
- Up to **5 team members** under one billing entity.
- Higher document limit (e.g. 100 docs / month per team).
- All features exposed:
  - Templates, multi-signer flows, most team-level features surface from Documenso.
- Priority in roadmap (if we add more stuff later).

> All numbers (doc limits) should be implemented as **configurable constants** so they can be tuned later without schema changes.

---

## 6. Plan Gating Rules

**Key invariant:** A user/team must always have exactly one **effective plan** that determines:

- Max docs per month.
- Whether team features are enabled.
- Which UI elements appear.

### 6.1 Entities

- `User`
  - `id`
  - `email`
  - `plan` (enum: `FREE`, `STARTER`, `PRO`)
  - `stripeCustomerId` (nullable)
  - `stripeSubscriptionId` (nullable)
  - `planValidUntil` (nullable datetime)
  - `totalDocumentsUsed` (for free lifetime cap)
- `Team` (or `Organization` depending on Documenso naming)
  - `id`
  - `ownerId`
  - `plan` (enum: `FREE`, `STARTER`, `PRO`) – or `INHERIT_FROM_OWNER` for simple mode
  - `stripeCustomerId` / `stripeSubscriptionId` (for Pro team billing)
  - `planValidUntil`
  - `memberCount` (or derived via relation)

- `Envelope`
  - Existing Documenso model.
  - Used for counting usage per user/team per month and total.

### 6.2 Enforcement

- On creating a new Envelope / document:
  1. Determine the **billing subject**:
     - If user belongs to a team with a plan, use team plan.
     - Else, use user plan.
  2. If `plan == FREE`:
     - Check `totalDocumentsUsed >= 5` → block, show upgrade modal.
  3. If `plan == STARTER` or `PRO`:
     - Count envelops created in the current monthly window for that subject.
     - If limit exceeded → block and prompt upgrade (or show “limit reached” for Starter).

- On inviting team members:
  - Only allowed if `plan == PRO`.
  - Enforce `memberCount <= 5`.

---

## 7. Technical Architecture

### 7.1 Base Stack

- Use the original **Documenso monorepo** as-is:
  - Keep `apps` and `packages` structure.
  - Keep all community edition features and code.
- Tech:
  - TypeScript, React (Remix/Hono), tRPC, Prisma, Postgres.
  - TailwindCSS + shadcn/ui.

### 7.2 Hosting & Infra

- **Platform:** Railway
  - Services:
    - Web app (main app / API).
    - Background worker if required.
    - Postgres DB.
- **Storage:**
  - S3-compatible (e.g. Cloudflare R2). Config via env.
- **Email:**
  - Resend.
- **Signing backend / HSM:**
  - Initial implementation: `local` signing transport.
  - Design config so HSM can be added later without refactor.

### 7.3 Environment Configuration

Key envs (names may be aligned to Documenso’s actual scheme):

- Application:
  - `NODE_ENV`
  - `APP_URL` (public URL)
  - `NEXTAUTH_SECRET` (or equivalent auth secret)
  - `NEXTAUTH_URL` / auth callback URLs

- Database:
  - `DATABASE_URL` (Postgres)

- Storage:
  - `NEXT_PUBLIC_UPLOAD_TRANSPORT=s3`
  - `S3_BUCKET`
  - `S3_REGION`
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_ENDPOINT` (for R2/other providers)

- Email (Resend):
  - `EMAIL_TRANSPORT=resend`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`

- Signing & Jobs:
  - `SIGNING_TRANSPORT=local` (for now)
  - `JOBS_PROVIDER=local` (for now)

- Auth:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - SMTP or Resend config for password/magic link if needed.

- Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_STARTER_ID` ($1/mo)
  - `STRIPE_PRICE_PRO_ID` ($11/mo)

- Analytics (optional phase 2):
  - `PLAUSIBLE_DOMAIN`
  - `PLAUSIBLE_SCRIPT_URL`
  - or other tool.

---

## 8. Stripe Integration – Functional Spec

### 8.1 Objects

- Stripe Products/Prices:
  - `starter` product → `$1/mo` recurring price.
  - `pro` product → `$11/mo` recurring price.

- Our DB fields:
  - On `User` and `Team` as described above.

### 8.2 Flows

#### 8.2.1 Free User Onboarding

1. User signs up (no card).
2. `User.plan = FREE`, `totalDocumentsUsed = 0`.
3. They can create and send documents until limit is reached.

#### 8.2.2 Upgrade Free → Starter (Individual)

1. User hits limit (5 docs) or clicks “Upgrade to Starter”.
2. App calls backend route `/api/billing/checkout` with:
   - Plan = `STARTER`
   - Mode = `subscription`
   - Subject = current user.
3. Backend:
   - Creates Stripe customer if not existing.
   - Creates Stripe Checkout session with:
     - `price = STRIPE_PRICE_STARTER_ID`
     - `mode = subscription`
     - `metadata: { userId }`
   - Returns Checkout URL.

4. User pays via Stripe Checkout.
5. Stripe sends `checkout.session.completed` and `customer.subscription.created` webhook.
6. Webhook handler:
   - Look up `userId` from metadata.
   - Set `User.plan = STARTER`
   - Store `stripeCustomerId`, `stripeSubscriptionId`, `planValidUntil` (from current_period_end).
   - Reset or leave `totalDocumentsUsed` as-is (but enforcement is now monthly, not lifetime).

#### 8.2.3 Upgrade to Pro/Teams

1. User chooses “Upgrade to Pro/Teams” from account/team settings.
2. Similar checkout flow, but:
   - Billing subject is **Team** (create or select team).
   - Stripe metadata includes `teamId`.
3. On webhook:
   - Set `Team.plan = PRO`.
   - Enforce team size limit & document limits.

#### 8.2.4 Downgrade / Cancel

For this case study, keep it simple:

- Use Stripe Billing Portal OR manual process.
- App:
  - Provides link: “Manage billing” which sends user to Stripe customer portal.
- Webhooks:
  - On `customer.subscription.deleted` or `...updated` with canceled status:
    - Set `plan = FREE` and stop further doc creation above free limit.
    - Store historical info (optional).

---

## 9. UX & Branding

### 9.1 Branding & Copy

- Replace all Documenso names/logos with our product brand (Signmate or final name).
- Key message:
  - “Fast, simple e-signature for founders and freelancers.”
  - “5 documents free. Then $1/mo.”

### 9.2 Navigation

- Keep structure similar to Documenso but:
  - Hide obviously enterprise-only pieces that we won’t support yet (e.g. deep integrations, advanced admin).
  - Show “Billing / Plan” page in account/team settings.

### 9.3 Marketing Site

- Clone Documenso marketing site app.
- Changes:
  - Hero section: describe our niche.
  - Pricing section: Free / Starter / Pro with our pricing and feature matrix.
  - CTAs: “Sign up free” and “Upgrade for $1/mo.”

---

## 10. Non-Functional Requirements

- **Performance:** Reasonable for small usage; no dedicated perf work right now.
- **Security:**
  - HTTPS everywhere in production.
  - Secrets stored in Railway env.
  - No logging of raw signed documents or secrets.
- **Reliability:** Good enough for small number of users; single region is fine.
- **Compliance / Legal Copy:**
  - We do **not** promise any specific regulatory compliance beyond basic e-signatures.
  - Provide clear disclaimer and ToS/Privacy policy pages.

---

## 11. Roadmap / Phases (2 Weeks)

### Phase 1 – Baseline Clone & Boot (Day 1–3)

- Clone Documenso repo and set up monorepo locally.
- Get app and marketing site running locally with dummy config.
- Deploy a vanilla build to Railway (no custom billing yet).
- Confirm auth flow and basic document creation work.

### Phase 2 – Billing & Plan Gating (Day 3–7)

- Extend Prisma schema for plan/billing fields.
- Implement Stripe integration (checkout + webhooks).
- Implement plan gating and enforcement logic for:
  - Free lifetime 5-doc cap.
  - Monthly limits for Starter/Pro.
- Add plan status and usage indicators in account UI.

### Phase 3 – Branding & Templates (Day 7–10)

- Rebrand UI and marketing site.
- Add starter templates (NDA + contractor agreement).
- Clean navigation and hide unused/unstable features.

### Phase 4 – Polish & Launch (Day 10–14)

- Add basic analytics.
- Write ToS/Privacy pages.
- Polish empty states, error states around billing limits.
- Deploy, test, and start distribution (content + small ad spend).
