import { PlanType } from '@prisma/client';
import type Stripe from 'stripe';

import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { stripe } from '@documenso/lib/server-only/stripe';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

const STARTER_PRICE_ID = () => env('NEXT_PRIVATE_STRIPE_STARTER_PRICE_ID');
const PRO_PRICE_ID = () => env('NEXT_PRIVATE_STRIPE_PRO_PRICE_ID');
const WEBHOOK_SECRET = () => env('NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET');

const ensureStarterPriceId = () => {
  const priceId = STARTER_PRICE_ID();

  if (!priceId) {
    throw new Error('Missing NEXT_PRIVATE_STRIPE_STARTER_PRICE_ID');
  }

  return priceId;
};

const ensureProPriceId = () => {
  const priceId = PRO_PRICE_ID();

  if (!priceId) {
    throw new Error('Missing NEXT_PRIVATE_STRIPE_PRO_PRICE_ID');
  }

  return priceId;
};

const ensureStripeCustomerForUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: {
      userId: String(user.id),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
};

const ensureStripeCustomerForTeam = async (teamId: number) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      stripeCustomerId: true,
      organisation: {
        select: {
          owner: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  if (team.stripeCustomerId) {
    return team.stripeCustomerId;
  }

  const owner = team.organisation.owner;

  const customer = await stripe.customers.create({
    email: owner.email,
    name: team.name,
    metadata: {
      teamId: String(team.id),
    },
  });

  await prisma.team.update({
    where: { id: team.id },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
};

const defaultSuccessUrl = () => `${NEXT_PUBLIC_WEBAPP_URL()}/settings/billing?checkout=success`;
const defaultCancelUrl = () => `${NEXT_PUBLIC_WEBAPP_URL()}/settings/billing?checkout=cancelled`;

export const createCheckoutSessionForUserStarter = async ({
  userId,
  successUrl = defaultSuccessUrl(),
  cancelUrl = defaultCancelUrl(),
}: {
  userId: number;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  const customerId = await ensureStripeCustomerForUser(userId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: ensureStarterPriceId(),
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        plan: 'STARTER',
        userId: String(userId),
      },
    },
    metadata: {
      plan: 'STARTER',
      userId: String(userId),
    },
  });

  return session;
};

export const createCheckoutSessionForTeamPro = async ({
  teamId,
  successUrl = defaultSuccessUrl(),
  cancelUrl = defaultCancelUrl(),
}: {
  teamId: number;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  const customerId = await ensureStripeCustomerForTeam(teamId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: ensureProPriceId(),
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        plan: 'PRO',
        teamId: String(teamId),
      },
    },
    metadata: {
      plan: 'PRO',
      teamId: String(teamId),
    },
  });

  return session;
};

const isSubscriptionActive = (status: Stripe.Subscription.Status) =>
  status === 'active' || status === 'trialing';

const planValidUntil = (subscription: Stripe.Subscription) =>
  subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

const downgradeUser = async (userId: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: PlanType.FREE,
      planValidUntil: null,
      stripeSubscriptionId: null,
    },
  });
};

const downgradeTeam = async (teamId: number) => {
  await prisma.team.update({
    where: { id: teamId },
    data: {
      plan: PlanType.FREE,
      planValidUntil: null,
      stripeSubscriptionId: null,
    },
  });
};

const syncSubscription = async (subscription: Stripe.Subscription) => {
  const metadata = subscription.metadata ?? {};
  const plan = (metadata.plan ?? '').toUpperCase();
  const userId = metadata.userId ? Number(metadata.userId) : undefined;
  const teamId = metadata.teamId ? Number(metadata.teamId) : undefined;
  const active = isSubscriptionActive(subscription.status);

  if (plan === 'STARTER' && userId) {
    if (!active) {
      await downgradeUser(userId);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: PlanType.STARTER,
        planValidUntil: planValidUntil(subscription),
        stripeSubscriptionId: subscription.id,
      },
    });
  }

  if (plan === 'PRO' && teamId) {
    if (!active) {
      await downgradeTeam(teamId);
      return;
    }

    await prisma.team.update({
      where: { id: teamId },
      data: {
        plan: PlanType.PRO,
        planValidUntil: planValidUntil(subscription),
        stripeSubscriptionId: subscription.id,
      },
    });
  }
};

export const handleStripeWebhook = async (request: Request) => {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe signature', { status: 400 });
  }

  const secret = WEBHOOK_SECRET();

  if (!secret) {
    return new Response('Stripe webhook secret missing', { status: 500 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Invalid stripe signature', error);
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.resumed':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  return Response.json({ received: true });
};
