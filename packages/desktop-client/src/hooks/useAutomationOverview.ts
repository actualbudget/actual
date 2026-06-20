import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { AutomationOverview } from '@actual-app/core/types/models';

export function useAutomationOverview(startMonth: string, endMonth: string) {
  const [data, setData] = useState<AutomationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await send('budget/get-automation-overview', {
          startMonth,
          endMonth,
        });
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [startMonth, endMonth]);

  return { data, loading, error };
}
