import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

export function usePluggyAiStatus(fileId: string) {
  const [configuredPluggyAi, setConfiguredPluggyAi] = useState<boolean | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    const budgetFileId = fileId;

    async function fetch() {
      setIsLoading(true);

      const result = await send('pluggyai-status', {
        fileId: budgetFileId,
      });

      setConfiguredPluggyAi(
        (result as { configured?: boolean })?.configured || false,
      );
      setIsLoading(false);
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status, fileId]);

  return {
    configuredPluggyAi,
    isLoading,
  };
}
