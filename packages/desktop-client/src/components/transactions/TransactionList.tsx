// @ts-strict-ignore
// TODO: remove strict
import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

import { theme } from '@actual-app/components/theme';

import { send } from 'loot-core/platform/client/fetch';
import {
  addSplitTransaction,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction,
} from 'loot-core/shared/transactions';
import { getChangedValues, type Diff } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type CategoryEntity,
  type PayeeEntity,
  type RuleConditionEntity,
  type ScheduleEntity,
  type TransactionEntity,
  type TransactionFilterEntity,
} from 'loot-core/types/models';

import {
  TransactionTable,
  type TransactionTableProps,
} from './TransactionsTable';

import { type TableHandleRef } from '@desktop-client/components/table';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

// When data changes, there are two ways to update the UI:
//
// * Optimistic updates: we apply the needed updates to local data
//   and rerender immediately, and send off the changes to the
//   server. Currently, it assumes the server request is successful.
//   If it fails the user will see a generic error which isn't
//   great, but since the server is local a failure is very
//   unlikely. Still, we should notify errors better.
//
// * A full refetch and rerender: this is needed when applying
//   updates locally is too complex. Usually this happens when
//   changing a field that data is sorted on: we're not going
//   to resort the data in memory, we want to rely on the database
//   for that. So we need to do a full refresh.
//
// When writing updates, it's up to you to decide which one to do.
// Optimistic updates feel snappy, but they might show data
// differently than a full refresh. It's up to you to decide which
// one to use when doing updates.

const pendingBatch: {
  transactions: Map<
    string,
    {
      diff: Partial<Diff<TransactionEntity>>;
      changes: ReturnType<typeof updateTransaction>;
      onChange: (
        transaction: TransactionEntity,
        transactions: TransactionEntity[],
      ) => void;
      learnCategories: boolean;
      timestamp: number;
    }
  >;
  timer: NodeJS.Timeout | null;
} = {
  transactions: new Map(),
  timer: null,
};

const BATCH_TIMEOUT_MS = 500;

function mergeDiff(
  current: Partial<Diff<TransactionEntity>> = {},
  incoming: Partial<Diff<TransactionEntity>> = {},
): Partial<Diff<TransactionEntity>> {
  const updatedById = new Map<string, Partial<TransactionEntity>>();

  for (const update of [
    ...(current.updated ?? []),
    ...(incoming.updated ?? []),
  ]) {
    const id = update?.id;
    if (!id) continue;
    updatedById.set(id, { ...(updatedById.get(id) ?? {}), ...update });
  }

  const dedupeById = (items: Partial<TransactionEntity>[] = []) => {
    const seen = new Map<string, Partial<TransactionEntity>>();
    for (const item of items) {
      const id = item?.id;
      if (!id) continue;
      seen.set(id, { ...(seen.get(id) ?? {}), ...item });
    }
    return Array.from(seen.values());
  };

  return {
    added: dedupeById([
      ...(current.added ?? []),
      ...(incoming.added ?? []),
    ]) as TransactionEntity[],
    updated: Array.from(updatedById.values()),
    deleted: dedupeById([
      ...(current.deleted ?? []),
      ...(incoming.deleted ?? []),
    ]).map(item => ({ id: item.id! })),
  };
}

async function saveDiff(diff, learnCategories) {
  const remoteUpdates = await send('transactions-batch-update', {
    ...diff,
    learnCategories,
  });

  if (remoteUpdates && remoteUpdates.updated.length > 0) {
    return { updates: remoteUpdates };
  }
  return {};
}

async function processBatch() {
  if (pendingBatch.transactions.size === 0) return;

  const batchSnapshot = new Map(pendingBatch.transactions);
  pendingBatch.transactions.clear();
  pendingBatch.timer = null;

  const transactionEntries = Array.from(batchSnapshot.entries());

  const [_, firstTransactionData] = transactionEntries[0] || [];
  const learnCategories = firstTransactionData?.learnCategories || false;

  const combinedDiff = {
    added: transactionEntries.flatMap(([_, data]) => data.diff.added || []),
    updated: transactionEntries.flatMap(([_, data]) => data.diff.updated || []),
    deleted: transactionEntries.flatMap(([_, data]) => data.diff.deleted || []),
  };

  const remoteDiff = await saveDiff(combinedDiff, learnCategories);

  if (
    remoteDiff.updates &&
    remoteDiff.updates.updated &&
    remoteDiff.updates.updated.length > 0
  ) {
    for (const [transactionId, data] of batchSnapshot) {
      const remoteUpdate = remoteDiff.updates.updated.find(
        u => u.id === transactionId,
      );
      if (remoteUpdate) {
        // Merge the server patch into the latest data and re-derive focused row
        const baseTx =
          data.changes.data.find(t => t.id === transactionId) ??
          data.changes.newTransaction;
        const mergedTx = { ...baseTx, ...remoteUpdate } as TransactionEntity;
        const remChanges = updateTransaction(data.changes.data, mergedTx);
        data.onChange(remChanges.newTransaction, remChanges.data);
      }
    }
  }
}

async function saveDiffAndApply(diff, changes, onChange, learnCategories) {
  const transactionId = diff.updated?.[0]?.id ?? changes?.newTransaction?.id;

  if (!transactionId) {
    console.error('Transaction missing ID in saveDiffAndApply:', {
      diff,
      hasChanges: !!changes,
      newTransactionId: changes?.newTransaction?.id,
      dataLength: changes?.data?.length,
    });
    return;
  }

  if (pendingBatch.timer) clearTimeout(pendingBatch.timer);

  const existing = pendingBatch.transactions.get(transactionId);

  pendingBatch.transactions.set(transactionId, {
    diff: existing ? mergeDiff(existing.diff, diff) : diff,
    changes,
    onChange,
    learnCategories,
    timestamp: existing?.timestamp ?? Date.now(),
  });

  pendingBatch.timer = setTimeout(() => {
    processBatch().catch(error => {
      console.error('Failed to process transaction batch:', error);
    });
  }, BATCH_TIMEOUT_MS);
}

type TransactionListProps = Pick<
  TransactionTableProps,
  | 'accounts'
  | 'allowSplitTransaction'
  | 'ascDesc'
  | 'balances'
  | 'categoryGroups'
  | 'dateFormat'
  | 'hideFraction'
  | 'isAdding'
  | 'isMatched'
  | 'isNew'
  | 'loadMoreTransactions'
  | 'onBatchDelete'
  | 'onBatchDuplicate'
  | 'onBatchLinkSchedule'
  | 'onBatchUnlinkSchedule'
  | 'onCloseAddTransaction'
  | 'onCreatePayee'
  | 'onCreateRule'
  | 'onMakeAsNonSplitTransactions'
  | 'onSort'
  | 'onScheduleAction'
  | 'payees'
  | 'renderEmpty'
  | 'showAccount'
  | 'showBalances'
  | 'showCleared'
  | 'showReconciled'
  | 'showSelection'
  | 'sortField'
  | 'transactions'
> & {
  tableRef: RefObject<TableHandleRef<TransactionEntity> | null>;
  allTransactions: TransactionEntity[];
  account: AccountEntity | undefined;
  category: CategoryEntity | undefined;
  onChange: (
    transaction: TransactionEntity,
    transactions: TransactionEntity[],
  ) => void;
  onApplyFilter: (
    f: Partial<RuleConditionEntity> | TransactionFilterEntity,
  ) => void;
  onRefetch: () => void;
};

export function TransactionList({
  tableRef,
  transactions,
  allTransactions,
  loadMoreTransactions,
  account,
  accounts,
  category,
  categoryGroups,
  payees,
  balances,
  showBalances,
  showReconciled,
  showCleared,
  showAccount,
  isAdding,
  isNew,
  isMatched,
  dateFormat,
  hideFraction,
  renderEmpty,
  onSort,
  sortField,
  ascDesc,
  onChange,
  onRefetch,
  onCloseAddTransaction,
  onCreatePayee,
  onApplyFilter,
  showSelection = true,
  allowSplitTransaction = true,
  onBatchDelete,
  onBatchDuplicate,
  onBatchLinkSchedule,
  onBatchUnlinkSchedule,
  onCreateRule,
  onScheduleAction,
  onMakeAsNonSplitTransactions,
}: TransactionListProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  const transactionsLatest = useRef<readonly TransactionEntity[]>([]);
  useLayoutEffect(() => {
    transactionsLatest.current = transactions;
  }, [transactions]);

  const onAdd = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      newTransactions = realizeTempTransactions(newTransactions);

      await saveDiff({ added: newTransactions }, isLearnCategoriesEnabled);
      onRefetch();
    },
    [isLearnCategoriesEnabled, onRefetch],
  );

  const onSave = useCallback(
    async (transaction: TransactionEntity) => {
      const changes = updateTransaction(
        transactionsLatest.current,
        transaction,
      );
      transactionsLatest.current = changes.data;

      if (changes.diff.updated.length > 0) {
        const dateChanged = !!changes.diff.updated[0].date;
        if (dateChanged) {
          // Make sure it stays at the top of the list of transactions
          // for that date
          changes.diff.updated[0].sort_order = Date.now();
          await saveDiff(changes.diff, isLearnCategoriesEnabled);
          onRefetch();
        } else {
          onChange(changes.newTransaction, changes.data);
          saveDiffAndApply(
            changes.diff,
            changes,
            onChange,
            isLearnCategoriesEnabled,
          );
        }
      }
    },
    [isLearnCategoriesEnabled, onChange, onRefetch],
  );

  const onAddSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = addSplitTransaction(transactionsLatest.current, id);
      onChange(changes.newTransaction, changes.data);
      saveDiffAndApply(
        changes.diff,
        changes,
        onChange,
        isLearnCategoriesEnabled,
      );
      return changes.diff.added[0].id;
    },
    [isLearnCategoriesEnabled, onChange],
  );

  const onSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = splitTransaction(transactionsLatest.current, id);
      onChange(changes.newTransaction, changes.data);
      saveDiffAndApply(
        changes.diff,
        changes,
        onChange,
        isLearnCategoriesEnabled,
      );
      return changes.diff.added[0].id;
    },
    [isLearnCategoriesEnabled, onChange],
  );

  const onApplyRules = useCallback(
    async (
      transaction: TransactionEntity,
      updatedFieldName: string | null = null,
    ) => {
      const afterRules = await send('rules-run', { transaction });

      // Show formula errors if any
      if (afterRules._ruleErrors && afterRules._ruleErrors.length > 0) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: `Formula errors in rules:\n${afterRules._ruleErrors.join('\n')}`,
              sticky: true,
            },
          }),
        );
      }

      const diff = getChangedValues(transaction, afterRules);

      const newTransaction: TransactionEntity = { ...transaction };
      if (diff) {
        Object.keys(diff).forEach(field => {
          if (
            newTransaction[field] == null ||
            newTransaction[field] === '' ||
            newTransaction[field] === 0 ||
            newTransaction[field] === false
          ) {
            newTransaction[field] = diff[field];
          }
        });

        // When a rule updates a parent transaction, overwrite all changes to the current field in subtransactions.
        if (
          transaction.is_parent &&
          diff.subtransactions !== undefined &&
          updatedFieldName !== null
        ) {
          newTransaction.subtransactions = diff.subtransactions.map(
            (st, idx) => ({
              ...(newTransaction.subtransactions?.[idx] || st),
              ...(st[updatedFieldName] != null && {
                [updatedFieldName]: st[updatedFieldName],
              }),
            }),
          );
        }
      }
      return newTransaction;
    },
    [dispatch],
  );

  const onManagePayees = useCallback(
    (id: PayeeEntity['id']) => {
      navigate('/payees', id ? { state: { selectedPayee: id } } : undefined);
    },
    [navigate],
  );

  const onNavigateToTransferAccount = useCallback(
    (accountId: AccountEntity['id']) => {
      navigate(`/accounts/${accountId}`);
    },
    [navigate],
  );

  const onNavigateToSchedule = useCallback(
    (scheduleId: ScheduleEntity['id']) => {
      dispatch(
        pushModal({
          modal: { name: 'schedule-edit', options: { id: scheduleId } },
        }),
      );
    },
    [dispatch],
  );

  const onNotesTagClick = useCallback(
    (tag: string) => {
      onApplyFilter({
        field: 'notes',
        op: 'hasTags',
        value: tag,
        type: 'string',
      });
    },
    [onApplyFilter],
  );

  return (
    <TransactionTable
      ref={tableRef}
      transactions={allTransactions}
      loadMoreTransactions={loadMoreTransactions}
      accounts={accounts}
      categoryGroups={categoryGroups}
      payees={payees}
      balances={balances}
      showBalances={showBalances}
      showReconciled={showReconciled}
      showCleared={showCleared}
      showAccount={showAccount}
      showCategory={true}
      currentAccountId={account && account.id}
      currentCategoryId={category && category.id}
      isAdding={isAdding}
      isNew={isNew}
      isMatched={isMatched}
      dateFormat={dateFormat}
      hideFraction={hideFraction}
      renderEmpty={renderEmpty}
      onSave={onSave}
      onApplyRules={onApplyRules}
      onSplit={onSplit}
      onCloseAddTransaction={onCloseAddTransaction}
      onAdd={onAdd}
      onAddSplit={onAddSplit}
      onManagePayees={onManagePayees}
      onCreatePayee={onCreatePayee}
      style={{ backgroundColor: theme.tableBackground }}
      onNavigateToTransferAccount={onNavigateToTransferAccount}
      onNavigateToSchedule={onNavigateToSchedule}
      onNotesTagClick={onNotesTagClick}
      onSort={onSort}
      sortField={sortField}
      ascDesc={ascDesc}
      onBatchDelete={onBatchDelete}
      onBatchDuplicate={onBatchDuplicate}
      onBatchLinkSchedule={onBatchLinkSchedule}
      onBatchUnlinkSchedule={onBatchUnlinkSchedule}
      onCreateRule={onCreateRule}
      onScheduleAction={onScheduleAction}
      onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
      showSelection={showSelection}
      allowSplitTransaction={allowSplitTransaction}
    />
  );
}
