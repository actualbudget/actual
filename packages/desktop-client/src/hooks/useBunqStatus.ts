import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useBunqStatus() {
  const [configuredBunq, setConfiguredBunq] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('bunq-status');
        setConfiguredBunq(results.configured || false);
      } catch {
        setConfiguredBunq(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredBunq,
    isLoading,
  };
}
