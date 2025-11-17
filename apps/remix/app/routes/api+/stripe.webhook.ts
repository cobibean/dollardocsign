import { handleStripeWebhook } from '@documenso/lib/server-only/billing/stripe';

import type { Route } from './+types/webhook.trigger';

export async function action({ request }: Route.ActionArgs) {
  return await handleStripeWebhook(request);
}
