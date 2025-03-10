import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function usePluggyAiStatus() {
  const [configuredPluggyAi, setConfiguredPluggyAi] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('pluggyai-status');

      setConfiguredPluggyAi(results.configured || false);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredPluggyAi,
    isLoading,
  };
}
