import { useEffect, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import useSyncServerStatus from './useSyncServerStatus';

export default function useNordigenStatus() {
  let [configured, setConfigured] = useState<boolean | null>(null);
  let [isLoading, setIsLoading] = useState(false);
  let status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      let results = await send('nordigen-status');

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
