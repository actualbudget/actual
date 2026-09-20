import { useEffect, useState } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useSpreadsheet } from './useSpreadsheet';

// Returns, for each category, its balance in each of the given months.
// Values that have not loaded yet are missing from the result.
export function useCategoryBalances(
  categoryIds: Array<CategoryEntity['id']>,
  months: string[],
  enabled: boolean,
): Map<CategoryEntity['id'], number[]> {
  const spreadsheet = useSpreadsheet();
  const [balances, setBalances] = useState<Record<string, number>>({});

  // Serialized so the effect only re-runs when the actual values change.
  const idsKey = categoryIds.join(',');
  const monthsKey = months.join(',');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const ids = idsKey ? idsKey.split(',') : [];
    const monthList = monthsKey ? monthsKey.split(',') : [];

    const unbinds = monthList.flatMap(month =>
      ids.map(id => {
        const key = `${month}!${id}`;
        return spreadsheet.bind(
          monthUtils.sheetForMonth(month),
          `leftover-${id}`,
          result => {
            const value = typeof result.value === 'number' ? result.value : 0;
            setBalances(prev =>
              prev[key] === value ? prev : { ...prev, [key]: value },
            );
          },
        );
      }),
    );

    return () => unbinds.forEach(unbind => unbind());
  }, [spreadsheet, enabled, idsKey, monthsKey]);

  const result = new Map<CategoryEntity['id'], number[]>();
  if (enabled) {
    for (const id of categoryIds) {
      const values = months
        .map(month => balances[`${month}!${id}`])
        .filter(value => value !== undefined);
      if (values.length > 0) {
        result.set(id, values);
      }
    }
  }
  return result;
}
