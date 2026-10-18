import { useCallback, useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { FinTSStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useFinTSStatus(enabled = true) {
  const [finTSStatus, setFinTSStatus] = useState<FinTSStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const result = await send('fints-status');
    setFinTSStatus('error' in result ? null : result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (enabled && status === 'online') {
      void refresh();
    }
  }, [status, enabled, refresh]);

  return { finTSStatus, isLoading, refresh };
}
