import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';

import type { CompletedAuthorizationIndicatorProps } from './types';

export function CompletedAuthorizationIndicator({
  onContinue,
}: CompletedAuthorizationIndicatorProps) {
  return (
    <Button
      variant="primary"
      autoFocus
      style={{
        padding: '10px 0',
        fontSize: 15,
        fontWeight: 600,
        marginTop: 10,
      }}
      onPress={async () => {
        await onContinue();
      }}
    >
      <Trans>Success! Click to continue</Trans> &rarr;
    </Button>
  );
}
