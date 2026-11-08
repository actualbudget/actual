import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useTrueLayerStatus(enabled = true) {
  const [configuredTrueLayer, setConfiguredTrueLayer] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!enabled) return;

    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('truelayer-status');
        setConfiguredTrueLayer(results?.configured || false);
      } catch {
        setConfiguredTrueLayer(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status, enabled]);

  return {
    configuredTrueLayer,
    isLoading,
  };
}
