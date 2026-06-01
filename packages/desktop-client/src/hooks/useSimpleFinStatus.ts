import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useSimpleFinStatus(fileId: string) {
  const [configuredSimpleFin, setConfiguredSimpleFin] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    const budgetFileId = fileId;

    async function fetch() {
      setIsLoading(true);

      const results = await send('simplefin-status', {
        fileId: budgetFileId,
      });

      setConfiguredSimpleFin(
        (results as { configured?: boolean })?.configured || false,
      );
      setIsLoading(false);
    }

    if (status === 'online' && budgetFileId) {
      void fetch();
    }
  }, [status, fileId]);

  return {
    configuredSimpleFin,
    isLoading,
  };
}
