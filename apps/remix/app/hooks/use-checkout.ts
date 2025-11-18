import { useCallback, useState } from 'react';

import { useToast } from '@documenso/ui/primitives/use-toast';

import { useCurrentTeam } from '~/providers/team';

export type CheckoutPlan = 'STARTER' | 'PRO';

const parseResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));
  return data as { url?: string; message?: string };
};

export const useCheckoutRedirect = () => {
  const { toast } = useToast();
  const team = useCurrentTeam();
  const [isLoading, setIsLoading] = useState(false);

  const startCheckout = useCallback(
    async (plan: CheckoutPlan) => {
      try {
        setIsLoading(true);

        const payload: Record<string, unknown> = { plan };

        if (plan === 'PRO') {
          if (!team?.id) {
            throw new Error('You need a team before upgrading to Pro.');
          }

          payload.teamId = team.id;
        }

        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await parseResponse(response);
          throw new Error(data.message ?? 'Unable to start checkout.');
        }

        const data = await parseResponse(response);

        if (!data.url) {
          throw new Error('Stripe did not return a checkout URL.');
        }

        window.location.href = data.url;
      } catch (error) {
        console.error(error);
        toast({
          title: 'Upgrade failed',
          description: error instanceof Error ? error.message : 'Unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [team?.id, toast],
  );

  return {
    startCheckout,
    isLoading,
  };
};

export const useBillingPortalRedirect = () => {
  const team = useCurrentTeam();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const openPortal = useCallback(
    async (scope: 'USER' | 'TEAM' = 'USER') => {
      try {
        setIsLoading(true);

        const body: Record<string, unknown> = {
          scope,
        };

        if (scope === 'TEAM') {
          if (!team?.id) {
            throw new Error('Select a team before opening the billing portal.');
          }

          body.teamId = team.id;
        }

        const response = await fetch('/api/billing/portal', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await parseResponse(response);
          throw new Error(data.message ?? 'Unable to open Stripe billing portal.');
        }

        const data = await parseResponse(response);

        if (!data.url) {
          throw new Error('Stripe did not return a billing portal URL.');
        }

        window.location.href = data.url;
      } catch (error) {
        console.error(error);
        toast({
          title: 'Unable to open billing portal',
          description: error instanceof Error ? error.message : 'Unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [team?.id, toast],
  );

  return {
    openPortal,
    isLoading,
  };
};
