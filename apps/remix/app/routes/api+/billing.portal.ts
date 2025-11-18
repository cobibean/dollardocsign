import { TeamMemberRole } from '@prisma/client';

import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import {
  createBillingPortalSessionForTeam,
  createBillingPortalSessionForUser,
} from '@documenso/lib/server-only/billing/stripe';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/billing.portal';

type BillingPortalRequest = {
  scope?: 'USER' | 'TEAM';
  teamId?: number;
};

export async function action({ request }: Route.ActionArgs) {
  const { user } = await getSession(request);

  if (!user) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: BillingPortalRequest = {};

  try {
    body = (await request.json()) as BillingPortalRequest;
  } catch (error) {
    // swallow parse errors and rely on defaults
  }

  if (body.scope === 'TEAM') {
    const requestedTeamId =
      typeof body.teamId === 'number' ? body.teamId : Number(body.teamId ?? NaN);

    if (!requestedTeamId || Number.isNaN(requestedTeamId)) {
      return Response.json({ message: 'teamId is required for TEAM billing portal requests' }, { status: 400 });
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

    const session = await createBillingPortalSessionForTeam({ teamId: team.id });

    return Response.json({ url: session.url });
  }

  const session = await createBillingPortalSessionForUser({ userId: user.id });

  return Response.json({ url: session.url });
}
