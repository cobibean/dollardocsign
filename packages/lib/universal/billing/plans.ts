import type { PlanType } from '@prisma/client';

export type BillingSubjectType = 'USER' | 'TEAM';

export type SignmatePlan = Extract<PlanType, 'FREE' | 'STARTER' | 'PRO'>;

export const FREE_LIFETIME_DOC_LIMIT = 5;
export const STARTER_MONTHLY_DOC_LIMIT = 20;
export const PRO_MONTHLY_DOC_LIMIT = 100;
export const PRO_TEAM_MEMBER_LIMIT = 5;
export const DEFAULT_MAX_ENVELOPE_ITEM_COUNT = 5;

export const PLAN_DISPLAY_NAMES: Record<SignmatePlan, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PRO: 'Pro / Teams',
};

export const getPlanBillingSubject = (plan: SignmatePlan): BillingSubjectType =>
  plan === 'PRO' ? 'TEAM' : 'USER';

export const getDocumentLimitForPlan = (plan: SignmatePlan): number => {
  switch (plan) {
    case 'FREE':
      return FREE_LIFETIME_DOC_LIMIT;
    case 'STARTER':
      return STARTER_MONTHLY_DOC_LIMIT;
    case 'PRO':
      return PRO_MONTHLY_DOC_LIMIT;
    default:
      return 0;
  }
};

export const isPaidPlan = (plan: SignmatePlan) => plan !== 'FREE';
