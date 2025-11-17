import { TeamMemberRole } from '@prisma/client';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import {
  createCheckoutSessionForTeamPro,
  createCheckoutSessionForUserStarter,
} from '@documenso/lib/server-only/billing/stripe';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/billing.checkout';

type CheckoutRequestBody = {
  plan: 'STARTER' | 'PRO';
  teamId?: number;
};

export async function action({ request }: Route.ActionArgs) {
  const { user } = await getSession(request);

  if (!user) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: CheckoutRequestBody | null = null;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch (error) {
    return Response.json({ message: 'Invalid request body' }, { status: 400 });
  }

  if (!body || (body.plan !== 'STARTER' && body.plan !== 'PRO')) {
    return Response.json({ message: 'Unsupported plan' }, { status: 400 });
  }

  if (body.plan === 'STARTER') {
    const session = await createCheckoutSessionForUserStarter({ userId: user.id });

    if (!session.url) {
      return Response.json({ message: 'Unable to start checkout session' }, { status: 500 });
    }

    return Response.json({ url: session.url });
  }

  const requestedTeamId =
    typeof body.teamId === 'number' ? body.teamId : Number(body.teamId ?? NaN);

  if (!requestedTeamId || Number.isNaN(requestedTeamId)) {
    return Response.json({ message: 'teamId is required for Pro checkout' }, { status: 400 });
  }

  const team = await prisma.team.findFirst({
    where: buildTeamWhereQuery({
      teamId: requestedTeamId,
      userId: user.id,
      roles: [TeamMemberRole.ADMIN],
    }),
    select: {
      id: true,
    },
  });

  if (!team) {
    return Response.json({ message: 'Team not found' }, { status: 404 });
  }

  const session = await createCheckoutSessionForTeamPro({ teamId: team.id });

  if (!session.url) {
    return Response.json({ message: 'Unable to start checkout session' }, { status: 500 });
  }

  return Response.json({ url: session.url });
}
