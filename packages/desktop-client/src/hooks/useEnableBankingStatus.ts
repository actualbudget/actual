import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { BankSyncProviderStatus } from '@actual-app/core/types/models';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useEnableBankingStatus() {
  const [enableBankingStatus, setEnableBankingStatus] =
    useState<BankSyncProviderStatus>({});
  const [isLoading, setIsLoading] = useState(true);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      try {
        setEnableBankingStatus((await send('enablebanking-status')) ?? {});
      } catch {
        setEnableBankingStatus({});
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status]);

  return {
    configuredEnableBanking: isLoading
      ? null
      : Boolean(enableBankingStatus.configured),
    enableBankingStatus,
    setEnableBankingStatus,
    isLoading,
  };
}
