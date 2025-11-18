/// <reference types="./stripe.d.ts" />
import Stripe from 'stripe';

import { env } from '../../utils/env';

const stripeSecretKey =
  env('STRIPE_SECRET_KEY') ?? env('NEXT_PRIVATE_STRIPE_API_KEY') ?? undefined;

if (!stripeSecretKey) {
  throw new Error(
    'Stripe secret key missing. Set STRIPE_SECRET_KEY (preferred) or NEXT_PRIVATE_STRIPE_API_KEY.',
  );
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15',
  typescript: true,
});

export { Stripe };
