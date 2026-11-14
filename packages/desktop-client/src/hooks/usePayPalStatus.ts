import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function usePayPalStatus(enabled = true) {
  const [configuredPayPal, setConfiguredPayPal] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!enabled) return;

    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('paypal-status');
        setConfiguredPayPal(results?.configured || false);
      } catch {
        setConfiguredPayPal(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status, enabled]);

  return {
    configuredPayPal,
    isLoading,
  };
}
