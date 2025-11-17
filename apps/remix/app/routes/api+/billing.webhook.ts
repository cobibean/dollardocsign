import { handleStripeWebhook } from '@documenso/lib/server-only/billing/stripe';

import type { Route } from './+types/billing.webhook';

export async function action({ request }: Route.ActionArgs) {
  return handleStripeWebhook(request);
}
