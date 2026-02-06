import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useSimpleFinStatus(fileId?: string) {
  const [configuredSimpleFin, setConfiguredSimpleFin] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!fileId) {
      setConfiguredSimpleFin(false);
      return;
    }

    async function fetch() {
      setIsLoading(true);

      const results = await send('simplefin-status', { fileId });

      setConfiguredSimpleFin(results.configured || false);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status, fileId]);

  return {
    configuredSimpleFin,
    isLoading,
  };
}
