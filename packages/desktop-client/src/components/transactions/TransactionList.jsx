import React, { useRef, useCallback, useLayoutEffect } from 'react';

import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  splitTransaction,
  updateTransaction,
  addSplitTransaction,
  realizeTempTransactions,
  applyTransactionDiff,
} from 'loot-core/src/shared/transactions';
import { getChangedValues, applyChanges } from 'loot-core/src/shared/util';

import { useNavigate } from '../../hooks/useNavigate';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { useDispatch } from '../../redux';
import { theme } from '../../style';

import { TransactionTable } from './TransactionsTable';

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

async function saveDiff(diff, learnCategories) {
  const remoteUpdates = await send('transactions-batch-update', {
    ...diff,
    learnCategories,
  });

  if (remoteUpdates.length > 0) {
    return { updates: remoteUpdates };
  }
  return {};
}

async function saveDiffAndApply(diff, changes, onChange, learnCategories) {
  const remoteDiff = await saveDiff(diff, learnCategories);
  onChange(
    applyTransactionDiff(changes.newTransaction, remoteDiff),
    applyChanges(remoteDiff, changes.data),
  );
}

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
  headerContent,
  isAdding,
  isNew,
  isMatched,
  isFiltered,
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
}) {
  const dispatch = useDispatch();
  const transactionsLatest = useRef();
  const navigate = useNavigate();
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  useLayoutEffect(() => {
    transactionsLatest.current = transactions;
  }, [transactions]);

  const onAdd = useCallback(async newTransactions => {
    newTransactions = realizeTempTransactions(newTransactions);

    await saveDiff({ added: newTransactions }, isLearnCategoriesEnabled);
    onRefetch();
  }, []);

  const onSave = useCallback(async transaction => {
    const changes = updateTransaction(transactionsLatest.current, transaction);
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
  }, []);

  const onAddSplit = useCallback(id => {
    const changes = addSplitTransaction(transactionsLatest.current, id);
    onChange(changes.newTransaction, changes.data);
    saveDiffAndApply(changes.diff, changes, onChange, isLearnCategoriesEnabled);
    return changes.diff.added[0].id;
  }, []);

  const onSplit = useCallback(id => {
    const changes = splitTransaction(transactionsLatest.current, id);
    onChange(changes.newTransaction, changes.data);
    saveDiffAndApply(changes.diff, changes, onChange, isLearnCategoriesEnabled);
    return changes.diff.added[0].id;
  }, []);

  const onApplyRules = useCallback(
    async (transaction, updatedFieldName = null) => {
      const afterRules = await send('rules-run', { transaction });
      const diff = getChangedValues(transaction, afterRules);

      const newTransaction = { ...transaction };
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
              ...(newTransaction.subtransactions[idx] || st),
              ...(st[updatedFieldName] != null && {
                [updatedFieldName]: st[updatedFieldName],
              }),
            }),
          );
        }
      }
      return newTransaction;
    },
    [],
  );

  const onManagePayees = useCallback(id => {
    navigate('/payees', { state: { selectedPayee: id } });
  });

  const onNavigateToTransferAccount = useCallback(accountId => {
    navigate(`/accounts/${accountId}`);
  });

  const onNavigateToSchedule = useCallback(scheduleId => {
    dispatch(
      pushModal({
        modal: { name: 'schedule-edit', options: { id: scheduleId } },
      }),
    );
  });

  const onNotesTagClick = useCallback(tag => {
    onApplyFilter({
      field: 'notes',
      op: 'hasTags',
      value: tag,
      type: 'string',
    });
  });

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
      isFiltered={isFiltered}
      dateFormat={dateFormat}
      hideFraction={hideFraction}
      headerContent={headerContent}
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
