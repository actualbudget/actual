import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

import { useSyncServerStatus } from './useSyncServerStatus';

type SimpleFinStatusResult = {
  configured?: boolean;
  error?: string;
};

export function useSimpleFinStatus() {
  const [configuredSimpleFin, setConfiguredSimpleFin] = useState<
    boolean | null
  >(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      try {
        const results = (await send('simplefin-status')) as
          | SimpleFinStatusResult
          | undefined;

        if (results?.error === 'rate-limited') {
          // SimpleFIN's API is blocked upstream (typically a Cloudflare
          // 403/429). The user is still configured — we just can't verify
          // right now — so preserve the existing "configured" view and
          // surface a flag for the UI to show a notification. See
          // issue #7785.
          setIsRateLimited(true);
          setConfiguredSimpleFin(prev => (prev === null ? true : prev));
        } else {
          setIsRateLimited(false);
          setConfiguredSimpleFin(results?.configured || false);
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      void fetch();
    }
  }, [status]);

  return {
    configuredSimpleFin,
    isLoading,
    isRateLimited,
  };
}
