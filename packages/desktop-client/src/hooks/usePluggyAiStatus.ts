import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function usePluggyAiStatus() {
  const [pluggyAiStatus, setPluggyAiStatus] = useState<BankSyncProviderStatus>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('pluggyai-status');

      setPluggyAiStatus(results);
      setIsLoading(false);
    }

    if (status !== 'online') {
      setPluggyAiStatus({});
      return;
    }

    void fetch();
  }, [status]);

  return {
    pluggyAiStatus,
    setPluggyAiStatus,
    isLoading,
  };
}
