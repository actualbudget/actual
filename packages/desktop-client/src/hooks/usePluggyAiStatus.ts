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
    async function fetchStatus() {
      setIsLoading(true);

      const [globalResult, fileResult] = await Promise.all([
        send('pluggyai-status'),
        fileId
          ? send('pluggyai-status', { fileId })
          : Promise.resolve({ configured: false }),
      ]);

      setConfiguredPluggyAi(
        (globalResult as { configured?: boolean })?.configured || false,
      );
      setConfiguredPluggyAiScoped(
        fileId
          ? (fileResult as { configured?: boolean })?.configured || false
          : null,
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
