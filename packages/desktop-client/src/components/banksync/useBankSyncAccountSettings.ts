import { useState } from 'react';

import {
  defaultMappings,
  mappingsFromString,
  mappingsToString,
} from 'loot-core/server/util/custom-sync-mapping';
import type { Mappings } from 'loot-core/server/util/custom-sync-mapping';
import { q } from 'loot-core/shared/query';

import { getFields } from './EditSyncAccount';
import type {
  MappableFieldWithExample,
  TransactionDirection,
} from './EditSyncAccount';

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

  const [savedUpdateDates = false, setSavedUpdateDates] = useSyncedPref(
    `sync-update-dates-${accountId}`,
  );

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
  const [updateDates, setUpdateDates] = useState(
    String(savedUpdateDates) === 'true',
  );

  const transactionQuery = q('transactions')
    .filter({
      account: accountId,
      amount: transactionDirection === 'payment' ? { $lte: 0 } : { $gt: 0 },
      raw_synced_data: { $ne: null },
    })
    .options({ splits: 'none' })
    .select('*');

  const { transactions } = useTransactions({
    query: transactionQuery,
  });

  const data = transactions?.[0]?.raw_synced_data;
  let exampleTransaction;
  if (data) {
    try {
      exampleTransaction = JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse transaction data:', error);
    }
  }

  const fields: MappableFieldWithExample[] = exampleTransaction
    ? getFields(exampleTransaction)
    : [];

  const saveSettings = () => {
    const mappingsStr = mappingsToString(mappings);
    setSavedMappings(mappingsStr);
    setSavedImportPending(String(importPending));
    setSavedImportNotes(String(importNotes));
    setSavedReimportDeleted(String(reimportDeleted));
    setSavedImportTransactions(String(importTransactions));
    setSavedUpdateDates(String(updateDates));
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
    updateDates,
    setUpdateDates,
    mappings,
    setMapping,
    exampleTransaction,
    fields,
    saveSettings,
  };
}
