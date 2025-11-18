import { useEffect, useState } from 'react';

import { Trans } from '@lingui/react/macro';

import type { PlanUsageSummary } from '@documenso/lib/server-only/billing/plan-limits';
import { PLAN_DISPLAY_NAMES } from '@documenso/lib/universal/billing/plans';

import { UpgradeCtaButtons } from './upgrade-cta-buttons';

type DashboardPlanStatusProps = {
  teamId: number;
};

export const DashboardPlanStatus = ({ teamId }: DashboardPlanStatusProps) => {
  const [usage, setUsage] = useState<PlanUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUsage = async () => {
      try {
        const response = await fetch(`/api/limits?teamId=${teamId}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message ?? 'Unable to load plan usage');
        }

        const data = (await response.json()) as PlanUsageSummary;

        if (!cancelled) {
          setUsage(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load plan usage');
        }
      }
    };

    void fetchUsage();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!usage && !error) {
    return (
      <div className="mb-6 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <Trans>Loading plan usage…</Trans>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const documentsUsed = usage.plan === 'FREE' ? usage.usage.lifetime.used : usage.usage.documents.used;
  const documentsLimit =
    usage.plan === 'FREE' ? usage.usage.lifetime.limit : usage.usage.documents.limit;

  return (
    <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase text-muted-foreground">
        <Trans>Plan status</Trans>
      </p>
      <p className="text-xl font-semibold">{PLAN_DISPLAY_NAMES[usage.plan] ?? usage.plan}</p>
      <p className="text-muted-foreground mt-1 text-sm">
        <Trans>
          {documentsUsed} of {documentsLimit}{' '}
          {usage.plan === 'FREE' ? <Trans>lifetime documents</Trans> : <Trans>documents this month</Trans>}
        </Trans>
      </p>

      <UpgradeCtaButtons
        className="mt-3"
        showStarter={usage.plan === 'FREE'}
        showPro={usage.plan !== 'PRO'}
      />
    </div>
  );
};
