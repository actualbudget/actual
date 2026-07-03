import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useOpenBankingIoStatus(enabled = true) {
  const [configuredOpenBankingIo, setConfiguredOpenBankingIo] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    async function fetch() {
      setIsLoading(true);
      try {
        const results = await send('openbankingio-status');
        setConfiguredOpenBankingIo(results.configured || false);
      } catch {
        setConfiguredOpenBankingIo(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      void fetch();
    } else {
      setIsLoading(false);
    }
  }, [status, enabled]);

  return {
    configuredOpenBankingIo,
    isLoading,
  };
}
