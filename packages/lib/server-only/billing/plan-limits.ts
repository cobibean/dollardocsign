import type { Prisma, Team, User } from '@prisma/client';
import { EnvelopeType, PlanType } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import {
  type BillingSubjectType,
  DEFAULT_MAX_ENVELOPE_ITEM_COUNT,
  FREE_LIFETIME_DOC_LIMIT,
  PRO_MONTHLY_DOC_LIMIT,
  PRO_TEAM_MEMBER_LIMIT,
  STARTER_MONTHLY_DOC_LIMIT,
  type SignmatePlan,
  getDocumentLimitForPlan,
  getPlanBillingSubject,
} from '../../universal/billing/plans';

export type MinimalBillingUser = Pick<
  User,
  'id' | 'plan' | 'planValidUntil' | 'totalDocumentsUsed'
>;
export type MinimalBillingTeam = Pick<Team, 'id' | 'plan' | 'planValidUntil'> | null;

export type EffectivePlanState = {
  plan: SignmatePlan;
  billingSubject: BillingSubjectType;
  subjectId: number;
};

export type CanCreateEnvelopeResult = {
  allowed: boolean;
  reason?: string;
  planState: EffectivePlanState;
  usage: {
    used: number;
    limit: number;
  };
};

const isPlanValid = (plan: PlanType, planValidUntil: Date | null | undefined, now: Date) => {
  if (plan === PlanType.FREE) {
    return false;
  }

  if (!planValidUntil) {
    return true;
  }

  return planValidUntil.getTime() > now.getTime();
};

const normalizePlan = (plan: PlanType): SignmatePlan => {
  if (plan === PlanType.STARTER || plan === PlanType.PRO) {
    return plan;
  }

  return PlanType.FREE;
};

export const getPlanForUser = ({
  user,
  team,
  now = new Date(),
}: {
  user: MinimalBillingUser;
  team?: MinimalBillingTeam;
  now?: Date;
}): EffectivePlanState => {
  if (team && isPlanValid(team.plan, team.planValidUntil, now)) {
    return {
      plan: normalizePlan(team.plan),
      billingSubject: getPlanBillingSubject(normalizePlan(team.plan)),
      subjectId: team.id,
    };
  }

  if (isPlanValid(user.plan, user.planValidUntil, now)) {
    return {
      plan: normalizePlan(user.plan),
      billingSubject: getPlanBillingSubject(normalizePlan(user.plan)),
      subjectId: user.id,
    };
  }

  return {
    plan: 'FREE',
    billingSubject: 'USER',
    subjectId: user.id,
  };
};

const getCurrentBillingWindow = (now: Date) => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

  return { start, end };
};

const countDocumentsForSubject = async (
  subject: BillingSubjectType,
  subjectId: number,
  window: ReturnType<typeof getCurrentBillingWindow>,
) => {
  return await prisma.envelope.count({
    where: {
      type: EnvelopeType.DOCUMENT,
      deletedAt: null,
      createdAt: {
        gte: window.start,
        lt: window.end,
      },
      ...(subject === 'TEAM' ? { teamId: subjectId } : { userId: subjectId }),
    },
  });
};

export const canCreateEnvelope = async ({
  user,
  team,
  now = new Date(),
}: {
  user: MinimalBillingUser;
  team?: MinimalBillingTeam;
  now?: Date;
}): Promise<CanCreateEnvelopeResult> => {
  const planState = getPlanForUser({ user, team, now });

  if (planState.plan === 'FREE') {
    const limit = FREE_LIFETIME_DOC_LIMIT;
    const used = user.totalDocumentsUsed;

    return {
      allowed: used < limit,
      reason:
        used >= limit
          ? 'Free plan allows 5 lifetime documents. Upgrade to continue sending documents.'
          : undefined,
      planState,
      usage: {
        used,
        limit,
      },
    };
  }

  const monthlyWindow = getCurrentBillingWindow(now);
  const used = await countDocumentsForSubject(
    planState.billingSubject,
    planState.subjectId,
    monthlyWindow,
  );

  const limit = planState.plan === 'STARTER' ? STARTER_MONTHLY_DOC_LIMIT : PRO_MONTHLY_DOC_LIMIT;

  return {
    allowed: used < limit,
    reason:
      used >= limit
        ? `You have reached your ${planState.plan.toLowerCase()} plan monthly document limit.`
        : undefined,
    planState,
    usage: {
      used,
      limit,
    },
  };
};

type PrismaOrTransactionClient = Prisma.TransactionClient | typeof prisma;

export const incrementUsageCountersOnEnvelopeCreated = async ({
  prismaClient,
  userId,
  plan,
}: {
  prismaClient: PrismaOrTransactionClient;
  userId: number;
  plan: SignmatePlan;
}) => {
  if (plan !== 'FREE') {
    return;
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: {
      totalDocumentsUsed: {
        increment: 1,
      },
    },
  });
};

export type PlanUsageSummary = {
  plan: SignmatePlan;
  billingSubject: BillingSubjectType;
  usage: {
    documents: {
      used: number;
      limit: number;
      remaining: number;
    };
    lifetime: {
      used: number;
      limit: number;
    };
    periodStart: Date;
    periodEnd: Date;
  };
  limits: {
    maximumEnvelopeItemCount: number;
    teamMemberLimit: number;
  };
};

export const getPlanUsageSummary = async ({
  userId,
  teamId,
  now = new Date(),
}: {
  userId: number;
  teamId: number;
  now?: Date;
}) => {
  const [user, team] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        planValidUntil: true,
        totalDocumentsUsed: true,
      },
    }),
    prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        plan: true,
        planValidUntil: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  const planState = getPlanForUser({ user, team, now });
  const window = getCurrentBillingWindow(now);

  let used = planState.plan === 'FREE' ? user.totalDocumentsUsed : 0;

  if (planState.plan !== 'FREE') {
    used = await countDocumentsForSubject(planState.billingSubject, planState.subjectId, window);
  }

  const limit = getDocumentLimitForPlan(planState.plan);

  return {
    plan: planState.plan,
    billingSubject: planState.billingSubject,
    usage: {
      documents: {
        used,
        limit,
        remaining: Math.max(limit - used, 0),
      },
      lifetime: {
        used: user.totalDocumentsUsed,
        limit: FREE_LIFETIME_DOC_LIMIT,
      },
      periodStart: window.start,
      periodEnd: window.end,
    },
    limits: {
      maximumEnvelopeItemCount: DEFAULT_MAX_ENVELOPE_ITEM_COUNT,
      teamMemberLimit: PRO_TEAM_MEMBER_LIMIT,
    },
  } satisfies PlanUsageSummary;
};
