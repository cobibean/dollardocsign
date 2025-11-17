import type { SubscriptionClaim } from '@prisma/client';

import { DEFAULT_MAX_ENVELOPE_ITEM_COUNT } from '@documenso/lib/universal/billing/plans';

export const generateDefaultSubscriptionClaim = (): Omit<
  SubscriptionClaim,
  'id' | 'organisation' | 'createdAt' | 'updatedAt' | 'originalSubscriptionClaimId'
> => {
  return {
    name: '',
    teamCount: 1,
    memberCount: 1,
    envelopeItemCount: DEFAULT_MAX_ENVELOPE_ITEM_COUNT,
    locked: false,
    flags: {},
  };
};
