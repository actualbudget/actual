import { useEffect, useState } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useSpreadsheet } from './useSpreadsheet';

type Subscription = {
  key: string;
  balances: Record<string, number>;
};

// Returns, for each category, its balance in each of the given months.
// Values that have not loaded yet are missing from the result.
export function useCategoryBalances(
  categoryIds: Array<CategoryEntity['id']>,
  months: string[],
  enabled: boolean,
): Map<CategoryEntity['id'], number[]> {
  const spreadsheet = useSpreadsheet();

  // Serialized so the effect only re-runs when the actual values change.
  const idsKey = categoryIds.join(',');
  const monthsKey = months.join(',');
  const subscriptionKey = enabled ? `${idsKey}|${monthsKey}` : '';

  // Balances are tagged with the subscription they were loaded for, so values
  // from an earlier subscription are never exposed.
  const [subscription, setSubscription] = useState<Subscription>({
    key: '',
    balances: {},
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const ids = idsKey ? idsKey.split(',') : [];
    const monthList = monthsKey ? monthsKey.split(',') : [];

    const unbinds = monthList.flatMap(month =>
      ids.map(id => {
        const cell = `${month}!${id}`;
        return spreadsheet.bind(
          monthUtils.sheetForMonth(month),
          `leftover-${id}`,
          result => {
            const value = typeof result.value === 'number' ? result.value : 0;
            setSubscription(prev => {
              const current = prev.key === subscriptionKey;
              if (current && prev.balances[cell] === value) {
                return prev;
              }
              return {
                key: subscriptionKey,
                balances: {
                  ...(current ? prev.balances : {}),
                  [cell]: value,
                },
              };
            });
          },
        );
      }),
    );

    return () => {
      unbinds.forEach(unbind => unbind());
      setSubscription({ key: '', balances: {} });
    };
  }, [spreadsheet, enabled, idsKey, monthsKey, subscriptionKey]);

  const result = new Map<CategoryEntity['id'], number[]>();
  if (enabled && subscription.key === subscriptionKey) {
    for (const id of categoryIds) {
      const values = months
        .map(month => subscription.balances[`${month}!${id}`])
        .filter(value => value !== undefined);
      if (values.length > 0) {
        result.set(id, values);
      }
    }
  }
  return result;
}
