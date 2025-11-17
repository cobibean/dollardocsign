import { useState } from 'react';

import { Trans } from '@lingui/react/macro';

import { useLimits } from '@documenso/lib/client-only/providers/plan-limits';
import type { SignmatePlan } from '@documenso/lib/universal/billing/plans';
import { PLAN_DISPLAY_NAMES, PRO_TEAM_MEMBER_LIMIT } from '@documenso/lib/universal/billing/plans';
import { Button } from '@documenso/ui/primitives/button';
import { useToast } from '@documenso/ui/primitives/use-toast';

const formatPlanName = (plan: SignmatePlan) => PLAN_DISPLAY_NAMES[plan] ?? plan;

type PlanBillingSectionProps = {
  teamId: number;
};

export const PlanBillingSection = ({ teamId }: PlanBillingSectionProps) => {
  const { plan, usage, loading } = useLimits();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState<'STARTER' | 'PRO' | null>(null);

  const handleUpgrade = async (targetPlan: 'STARTER' | 'PRO') => {
    try {
      setIsRedirecting(targetPlan);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          plan: targetPlan,
          teamId: targetPlan === 'PRO' ? teamId : undefined,
        }),
      });

      if (!response.ok) {
        const message = await response
          .json()
          .catch(() => ({ message: 'Unable to start checkout' }));
        throw new Error(message.message ?? 'Unable to start checkout');
      }

      const data = (await response.json()) as { url?: string };

      if (!data.url) {
        throw new Error('No checkout URL returned');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);

      toast({
        title: 'Unable to start checkout',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsRedirecting(null);
    }
  };

  const isStarterDisabled = plan !== 'FREE' && plan !== 'STARTER';
  const isProDisabled = plan === 'PRO';

  const documentsUsed = plan === 'FREE' ? usage.lifetime.used : usage.documents.used;
  const documentsLimit = plan === 'FREE' ? usage.lifetime.limit : usage.documents.limit;

  const usageLabel =
    plan === 'FREE'
      ? `${documentsUsed} of ${documentsLimit} lifetime documents used`
      : `${documentsUsed} of ${documentsLimit} documents used this month`;

  return (
    <section className="border-border/60 bg-card mt-8 rounded-lg border">
      <div className="border-border/60 border-b px-6 py-4">
        <h3 className="text-lg font-semibold">
          <Trans>Plan &amp; Billing</Trans>
        </h3>
        <p className="text-muted-foreground text-sm">
          <Trans>Track your current plan, usage, and upgrade to unlock more documents.</Trans>
        </p>
      </div>

      <div className="gap-6 px-6 py-6 lg:flex lg:items-center">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm">
            <Trans>Current plan</Trans>
          </p>
          <p className="text-xl font-semibold">{formatPlanName(plan)}</p>

          <div className="mt-4">
            <div className="text-muted-foreground text-sm font-medium">{usageLabel}</div>
            <div className="bg-muted mt-2 h-2 rounded-full">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (documentsUsed / Math.max(documentsLimit, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:mt-0 lg:min-w-[280px]">
          <Button
            variant="secondary"
            disabled={loading || isRedirecting !== null || isStarterDisabled}
            onClick={async () => handleUpgrade('STARTER')}
          >
            <Trans>Upgrade to Starter – $1/mo</Trans>
          </Button>
          <Button
            disabled={loading || isRedirecting !== null || isProDisabled}
            onClick={async () => handleUpgrade('PRO')}
          >
            <Trans>Upgrade to Pro / Teams – $11/mo</Trans>
          </Button>
          {plan === 'PRO' && (
            <p className="text-muted-foreground text-xs">
              Pro plans can invite up to {PRO_TEAM_MEMBER_LIMIT} team members.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
