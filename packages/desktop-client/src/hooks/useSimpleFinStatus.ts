import { useEffect, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import useSyncServerStatus from './useSyncServerStatus';

export default function useSimpleFinStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('simplefin-status');

      //setConfigured(results.configured || false);
      setConfigured(true);
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
