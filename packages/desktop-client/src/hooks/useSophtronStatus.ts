import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useSophtronStatus() {
  const [configuredSophtron, setConfiguredSophtron] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('sophtron-status');
        setConfiguredSophtron(Boolean(results?.configured));
      } catch {
        setConfiguredSophtron(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredSophtron,
    isLoading,
  };
}
