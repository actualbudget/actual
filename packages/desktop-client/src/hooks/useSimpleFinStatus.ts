import { useEffect, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useSimpleFinStatus() {
  const [configuredSimpleFin, setConfiguredSimpleFin] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('simplefin-status');

      setConfiguredSimpleFin(results.configured || false);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredSimpleFin,
    isLoading,
  };
}
