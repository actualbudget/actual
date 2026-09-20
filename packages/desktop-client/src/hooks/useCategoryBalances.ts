import { useEffect, useMemo, useState } from 'react';

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

  const idsKey = categoryIds.join(',');
  const monthsKey = months.join(',');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unbinds = months.flatMap(month =>
      categoryIds.map(id => {
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
    // idsKey/monthsKey are stable serializations of the arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadsheet, enabled, idsKey, monthsKey]);

  return useMemo(() => {
    const result = new Map<CategoryEntity['id'], number[]>();
    if (enabled) {
      for (const id of categoryIds) {
        const values = months
          .map(month => balances[`${month}!${id}`])
          .filter(v => v !== undefined);
        if (values.length > 0) {
          result.set(id, values);
        }
      }
    }
    return result;
    // idsKey/monthsKey are stable serializations of the arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, balances, idsKey, monthsKey]);
}
