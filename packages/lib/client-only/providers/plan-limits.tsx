import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { PlanUsageSummary } from '@documenso/lib/server-only/billing/plan-limits';
import type { SignmatePlan } from '@documenso/lib/universal/billing/plans';
import {
  DEFAULT_MAX_ENVELOPE_ITEM_COUNT,
  FREE_LIFETIME_DOC_LIMIT,
  PRO_TEAM_MEMBER_LIMIT,
} from '@documenso/lib/universal/billing/plans';

export type LimitsProviderProps = {
  teamId: number;
  initialValue?: {
    quota: {
      documents: number;
    };
    remaining: {
      documents: number;
    };
    maximumEnvelopeItemCount: number;
  };
  children: React.ReactNode;
};

export type LimitsContextValue = {
  plan: SignmatePlan;
  quota: {
    documents: number;
  };
  remaining: {
    documents: number;
  };
  usage: PlanUsageSummary['usage'];
  limits: PlanUsageSummary['limits'];
  maximumEnvelopeItemCount: number;
  refreshLimits: () => Promise<void>;
  loading: boolean;
};

const defaultUsage: PlanUsageSummary['usage'] = {
  documents: {
    used: 0,
    limit: 0,
    remaining: 0,
  },
  lifetime: {
    used: 0,
    limit: FREE_LIFETIME_DOC_LIMIT,
  },
  periodStart: new Date(),
  periodEnd: new Date(),
};

const defaultLimits = {
  maximumEnvelopeItemCount: DEFAULT_MAX_ENVELOPE_ITEM_COUNT,
  teamMemberLimit: PRO_TEAM_MEMBER_LIMIT,
};

const LimitsContext = createContext<LimitsContextValue | null>(null);

const mapUsageToQuota = (usage: PlanUsageSummary['usage']) => ({
  documents: usage.documents.limit,
});

const mapUsageToRemaining = (usage: PlanUsageSummary['usage']) => ({
  documents: usage.documents.remaining,
});

export const LimitsProvider = ({ children, teamId, initialValue }: LimitsProviderProps) => {
  const [usage, setUsage] = useState<PlanUsageSummary['usage']>(() => {
    if (initialValue) {
      return {
        ...defaultUsage,
        documents: {
          used: initialValue.quota.documents - initialValue.remaining.documents,
          limit: initialValue.quota.documents,
          remaining: initialValue.remaining.documents,
        },
      };
    }

    return defaultUsage;
  });

  const [plan, setPlan] = useState<SignmatePlan>('FREE');
  const [limits, setLimits] = useState<PlanUsageSummary['limits']>(() => ({
    ...defaultLimits,
    maximumEnvelopeItemCount:
      initialValue?.maximumEnvelopeItemCount ?? DEFAULT_MAX_ENVELOPE_ITEM_COUNT,
  }));
  const [loading, setLoading] = useState<boolean>(!initialValue);

  const fetchLimits = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/limits?teamId=${teamId}`, {
        headers: {
          'content-type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load limits');
      }

      const data: PlanUsageSummary = await response.json();

      setPlan(data.plan);
      setUsage(data.usage);
      setLimits(data.limits);
    } catch (error) {
      console.error('Failed to refresh plan limits', error);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void fetchLimits();
  }, [fetchLimits]);

  const contextValue = useMemo<LimitsContextValue>(() => {
    return {
      plan,
      quota: mapUsageToQuota(usage),
      remaining: mapUsageToRemaining(usage),
      usage,
      limits,
      maximumEnvelopeItemCount: limits.maximumEnvelopeItemCount,
      refreshLimits: fetchLimits,
      loading,
    };
  }, [fetchLimits, limits, loading, plan, usage]);

  return <LimitsContext.Provider value={contextValue}>{children}</LimitsContext.Provider>;
};

export const useLimits = () => {
  const context = useContext(LimitsContext);

  if (!context) {
    throw new Error('useLimits must be used within a LimitsProvider');
  }

  return context;
};
