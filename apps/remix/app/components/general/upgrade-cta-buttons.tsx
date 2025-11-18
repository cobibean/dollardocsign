import { Trans } from '@lingui/react/macro';

import { Button } from '@documenso/ui/primitives/button';

import { useCheckoutRedirect } from '~/hooks/use-checkout';

type UpgradeCtaButtonsProps = {
  showStarter?: boolean;
  showPro?: boolean;
  className?: string;
};

export const UpgradeCtaButtons = ({
  showStarter = false,
  showPro = false,
  className,
}: UpgradeCtaButtonsProps) => {
  const { startCheckout, isLoading } = useCheckoutRedirect();

  if (!showStarter && !showPro) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {showStarter && (
        <Button disabled={isLoading} onClick={() => void startCheckout('STARTER')}>
          <Trans>Upgrade to Starter</Trans>
        </Button>
      )}
      {showPro && (
        <Button
          variant={showStarter ? 'outline' : 'default'}
          disabled={isLoading}
          onClick={() => void startCheckout('PRO')}
        >
          <Trans>Upgrade to Pro</Trans>
        </Button>
      )}
    </div>
  );
};
