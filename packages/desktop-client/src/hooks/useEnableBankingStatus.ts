import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

export function useEnableBankingStatus() {
  const [configuredEnableBanking, setConfiguredEnableBanking] = useState<
    boolean | null
  >(null);
  const [enableBankingCountries, setEnableBankingCountries] = useState<Array<string> |null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('enablebanking-status');

      setConfiguredEnableBanking(results.configured || false);
      setEnableBankingCountries(results.application.countries || null);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredEnableBanking: configuredEnableBanking,
    countries: enableBankingCountries,
    isLoading,
  };
}
