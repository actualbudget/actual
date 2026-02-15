import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';

type UseNetWorthProjectionRefreshProps = {
  budgetType: SyncedPrefs['budgetType'];
  enabled: boolean;
};

export function useNetWorthProjectionRefresh({
  budgetType,
  enabled,
}: UseNetWorthProjectionRefreshProps) {
  const spreadsheet = useSpreadsheet();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    async function bindBudgetCells() {
      const bounds = await send('get-budget-bounds');
      if (cancelled) {
        return;
      }

      const months = monthUtils.rangeInclusive(
        monthUtils.currentMonth(),
        bounds.end,
      );
      const cellNames =
        budgetType === 'tracking'
          ? ['total-budgeted', 'total-budget-income']
          : ['total-budgeted'];

      months.forEach(month => {
        const sheetName = monthUtils.sheetForMonth(month);
        cellNames.forEach(name => {
          cleanups.push(
            spreadsheet.bind(sheetName, name, () => {
              setRevision(value => value + 1);
            }),
          );
        });
      });
    }

    bindBudgetCells();

    return () => {
      cancelled = true;
      cleanups.forEach(cleanup => cleanup());
    };
  }, [budgetType, enabled, spreadsheet]);

  return revision;
}
