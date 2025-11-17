import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getPlanUsageSummary } from '@documenso/lib/server-only/billing/plan-limits';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/limits';

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getSession(request);

  if (!user) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const teamIdParam = url.searchParams.get('teamId');

  if (!teamIdParam) {
    return Response.json({ message: 'Missing teamId' }, { status: 400 });
  }

  const teamId = Number(teamIdParam);

  if (Number.isNaN(teamId)) {
    return Response.json({ message: 'Invalid teamId' }, { status: 400 });
  }

  const team = await prisma.team.findFirst({
    where: buildTeamWhereQuery({ teamId, userId: user.id }),
    select: {
      id: true,
    },
  });

  if (!team) {
    return Response.json({ message: 'Team not found' }, { status: 404 });
  }

  const summary = await getPlanUsageSummary({ userId: user.id, teamId: team.id });

  return Response.json(summary);
}
