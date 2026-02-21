import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useGoCardlessStatus() {
  const [configuredGoCardless, setConfiguredGoCardless] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('gocardless-status');

      setConfiguredGoCardless(results.configured || false);
      setIsLoading(false);
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status]);

  return {
    configuredGoCardless,
    isLoading,
  };
}
