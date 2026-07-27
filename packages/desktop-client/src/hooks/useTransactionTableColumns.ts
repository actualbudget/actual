import { useMemo } from 'react';

import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { parseTransactionTableColumns } from '#components/transactions/table/columns';
import type { TransactionTableColumn } from '#components/transactions/table/columns';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { saveSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch, useSelector } from '#redux';

// Pseudo-account views that have their own per-view prefs alongside real
// account ids ('all-accounts' is the view with no account id in the URL).
export const SPECIAL_VIEW_IDS: string[] = [
  'onbudget',
  'offbudget',
  'uncategorized',
  'all-accounts',
];

/**
 * The transaction-table column configuration for one view. Columns saved for
 * the specific view win over the budget-wide configuration, and budgets that
 * haven't used the column manager yet fall back to the old per-account
 * visibility prefs (`show-balances-*` / `hide-cleared-*`).
 */
export function useTransactionTableColumns(accountId: string | undefined) {
  const dispatch = useDispatch();
  const [legacyShowBalances] = useSyncedPref(`show-balances-${accountId}`);
  const [legacyHideCleared] = useSyncedPref(`hide-cleared-${accountId}`);
  const [legacyShowGroup] = useSyncedPref(
    `show-group-${accountId || 'all-accounts'}`,
  );
  const [viewColumnsConfig, setViewColumnsConfig] = useSyncedPref(
    `transaction-table-columns-${accountId || 'all-accounts'}`,
  );
  const [globalColumnsConfig] = useSyncedPref('transaction-table-columns');
  const syncedPrefs = useSelector(state => state.prefs.synced);

  const columnsConfig = viewColumnsConfig || globalColumnsConfig;
  // Memoized manually (the React Compiler bails out on the consuming
  // components): `columnOrder` crosses the `memo()` boundary of every
  // transaction row, so its identity must only change when the config does.
  const transactionColumns = useMemo(
    () => parseTransactionTableColumns(columnsConfig),
    [columnsConfig],
  );
  const showBalances = columnsConfig
    ? !transactionColumns.find(column => column.id === 'balance')?.hidden
    : String(legacyShowBalances) === 'true';
  const showCleared = columnsConfig
    ? !transactionColumns.find(column => column.id === 'cleared')?.hidden
    : String(legacyHideCleared) !== 'true';
  const showGroup = columnsConfig
    ? !transactionColumns.find(column => column.id === 'group')?.hidden
    : String(legacyShowGroup) === 'true';
  // The balance/cleared/group columns stay in the order even when hidden:
  // their visibility is controlled by the show* flags, which can come from
  // the legacy prefs or component-state overrides instead of the config.
  const columnOrder = useMemo(
    () =>
      transactionColumns
        .filter(
          column =>
            column.id === 'balance' ||
            column.id === 'cleared' ||
            column.id === 'group' ||
            !column.hidden,
        )
        .map(column => column.id),
    [transactionColumns],
  );

  const saveColumns = (
    columns: TransactionTableColumn[],
    applyToAll: boolean,
  ) => {
    const serialized = JSON.stringify(columns);
    if (applyToAll) {
      // Save the budget-wide configuration and clear every stored
      // view-specific override in one batch so all tables actually show
      // this layout. Deriving the keys from the stored prefs also covers
      // views that no longer exist (e.g. closed or deleted accounts).
      const overrideKeys = (
        Object.keys(syncedPrefs) as (keyof SyncedPrefs)[]
      ).filter(
        key => key.startsWith('transaction-table-columns-') && syncedPrefs[key],
      );
      void dispatch(
        saveSyncedPrefs({
          prefs: {
            'transaction-table-columns': serialized,
            ...Object.fromEntries(overrideKeys.map(key => [key, ''])),
          },
        }),
      );
    } else {
      setViewColumnsConfig(serialized);
    }
  };

  return {
    transactionColumns,
    columnOrder,
    showBalances,
    showCleared,
    showGroup,
    saveColumns,
  };
}
