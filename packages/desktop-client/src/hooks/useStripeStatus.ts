import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useStripeStatus(enabled = true) {
  const [configuredStripe, setConfiguredStripe] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!enabled) return;

    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('stripe-status');
        setConfiguredStripe(results?.configured || false);
      } catch {
        setConfiguredStripe(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status, enabled]);

  return {
    configuredStripe,
    isLoading,
  };
}
