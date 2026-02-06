import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function usePluggyAiStatus(fileId?: string) {
  const [configuredPluggyAi, setConfiguredPluggyAi] = useState<boolean | null>(
    null,
  );
  const [configuredPluggyAiScoped, setConfiguredPluggyAiScoped] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    if (!fileId) {
      setConfiguredPluggyAi(false);
      setConfiguredPluggyAiScoped(null);
      return;
    }

    async function fetchStatus() {
      setIsLoading(true);

      const result = await send('pluggyai-status', { fileId });

      setConfiguredPluggyAi(
        (result as { configured?: boolean })?.configured || false,
      );
      setConfiguredPluggyAiScoped(
        (result as { configured?: boolean })?.configured || false,
      );
      setIsLoading(false);
    }

    if (status === 'online') {
      fetchStatus();
    }
  }, [status, fileId]);

  return {
    configuredPluggyAi,
    configuredPluggyAiScoped: fileId ? configuredPluggyAiScoped : undefined,
    isLoading,
  };
}
