import { useEffect, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

export default function useNordigenStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      const results = await send('nordigen-status');

      setConfigured(results.configured || false);
      setIsLoading(false);
    }

    fetch();
  }, [setConfigured, setIsLoading]);

  return {
    configured,
    isLoading,
  };
}
