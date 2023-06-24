import { useEffect, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import useSyncServerStatus from './useSyncServerStatus';

export default function useNordigenStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('nordigen-status');

      setConfigured(results.configured || false);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configured,
    isLoading,
  };
}
