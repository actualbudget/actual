import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useEnableBankingStatus() {
  const [configuredEnableBanking, setConfiguredEnableBanking] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('enablebanking-status');
      console.log(results)

      setConfiguredEnableBanking(results.configured || false);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredEnableBanking: configuredEnableBanking,
    isLoading,
  };
}
