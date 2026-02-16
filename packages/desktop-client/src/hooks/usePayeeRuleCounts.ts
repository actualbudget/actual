import { useCallback, useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/connection';

type PayeeRuleCounts = Map<string, number>;

type UsePayeeRuleCountsResult = {
  ruleCounts: PayeeRuleCounts;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

export function usePayeeRuleCounts(): UsePayeeRuleCountsResult {
  const [ruleCounts, setRuleCounts] = useState<PayeeRuleCounts>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const counts = await send('payees-get-rule-counts');
      const countsMap = new Map(Object.entries(counts));
      setRuleCounts(countsMap);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ruleCounts, isLoading, refetch };
}
