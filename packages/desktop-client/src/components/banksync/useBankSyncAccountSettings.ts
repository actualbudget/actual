import { useMemo, useState } from 'react';

import {
  defaultMappings,
  type Mappings,
  mappingsFromString,
  mappingsToString,
} from 'loot-core/server/util/custom-sync-mapping';
import { q } from 'loot-core/shared/query';

import { type TransactionDirection } from './EditSyncAccount';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useTransactions } from '@desktop-client/hooks/useTransactions';

export function useBankSyncAccountSettings(accountId: string) {
  const [savedMappings = mappingsToString(defaultMappings), setSavedMappings] =
    useSyncedPref(`custom-sync-mappings-${accountId}`);
  const [savedImportNotes = true, setSavedImportNotes] = useSyncedPref(
    `sync-import-notes-${accountId}`,
  );
  const [savedImportPending = true, setSavedImportPending] = useSyncedPref(
    `sync-import-pending-${accountId}`,
  );
  const [savedReimportDeleted = true, setSavedReimportDeleted] = useSyncedPref(
    `sync-reimport-deleted-${accountId}`,
  );
  const [savedImportTransactions = true, setSavedImportTransactions] =
    useSyncedPref(`sync-import-transactions-${accountId}`);

  const [transactionDirection, setTransactionDirection] =
    useState<TransactionDirection>('payment');
  const [importPending, setImportPending] = useState(
    String(savedImportPending) === 'true',
  );
  const [importNotes, setImportNotes] = useState(
    String(savedImportNotes) === 'true',
  );
  const [reimportDeleted, setReimportDeleted] = useState(
    String(savedReimportDeleted) === 'true',
  );
  const [mappings, setMappings] = useState<Mappings>(
    mappingsFromString(savedMappings),
  );
  const [importTransactions, setImportTransactions] = useState(
    String(savedImportTransactions) === 'true',
  );

  const transactionQuery = useMemo(
    () =>
      q('transactions')
        .filter({
          account: accountId,
          amount: transactionDirection === 'payment' ? { $lte: 0 } : { $gt: 0 },
          raw_synced_data: { $ne: null },
        })
        .options({ splits: 'none' })
        .select('*'),
    [accountId, transactionDirection],
  );

  const { transactions } = useTransactions({
    query: transactionQuery,
  });

  const exampleTransaction = useMemo(() => {
    const data = transactions?.[0]?.raw_synced_data;
    if (!data) return undefined;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse transaction data:', error);
      return undefined;
    }
  }, [transactions]);

  const saveSettings = () => {
    const mappingsStr = mappingsToString(mappings);
    setSavedMappings(mappingsStr);
    setSavedImportPending(String(importPending));
    setSavedImportNotes(String(importNotes));
    setSavedReimportDeleted(String(reimportDeleted));
    setSavedImportTransactions(String(importTransactions));
  };

  const setMapping = (field: string, value: string) => {
    setMappings(prev => {
      const updated = new Map(prev);
      const directionMap = updated.get(transactionDirection);
      if (directionMap) {
        const newDirectionMap = new Map(directionMap);
        newDirectionMap.set(field, value);
        updated.set(transactionDirection, newDirectionMap);
      }
      return updated;
    });
  };

  return {
    // State
    transactionDirection,
    setTransactionDirection,
    importPending,
    setImportPending,
    importNotes,
    setImportNotes,
    reimportDeleted,
    setReimportDeleted,
    importTransactions,
    setImportTransactions,
    mappings,
    setMapping,
    // Derived data
    exampleTransaction,
    // Actions
    saveSettings,
  };
}
