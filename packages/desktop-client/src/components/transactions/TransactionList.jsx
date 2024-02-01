import React, { useRef, useCallback, useLayoutEffect } from 'react';

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

async function saveDiff(diff) {
  const remoteUpdates = await send('transactions-batch-update', {
    ...diff,
    learnCategories: true,
  });
  if (remoteUpdates.length > 0) {
    return { updates: remoteUpdates };
  }
  return {};
}

async function saveDiffAndApply(diff, changes, onChange) {
  const remoteDiff = await saveDiff(diff);
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
  showCleared,
  showAccount,
  headerContent,
  isAdding,
  isNew,
  isMatched,
  isFiltered,
  dateFormat,
  hideFraction,
  addNotification,
  pushModal,
  renderEmpty,
  onSort,
  sortField,
  ascDesc,
  onChange,
  onRefetch,
  onCloseAddTransaction,
  onCreatePayee,
}) {
  const transactionsLatest = useRef();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    transactionsLatest.current = transactions;
  }, [transactions]);

  const onAdd = useCallback(async newTransactions => {
    newTransactions = realizeTempTransactions(newTransactions);

    await saveDiff({ added: newTransactions });
    onRefetch();
  }, []);

  const onSave = useCallback(async transaction => {
    const changes = updateTransaction(transactionsLatest.current, transaction);

    if (changes.diff.updated.length > 0) {
      const dateChanged = !!changes.diff.updated[0].date;
      if (dateChanged) {
        // Make sure it stays at the top of the list of transactions
        // for that date
        changes.diff.updated[0].sort_order = Date.now();
        await saveDiff(changes.diff);
        onRefetch();
      } else {
        onChange(changes.newTransaction, changes.data);
        saveDiffAndApply(changes.diff, changes, onChange);
      }
    }
  }, []);

  const onAddSplit = useCallback(id => {
    const changes = addSplitTransaction(transactionsLatest.current, id);
    onChange(changes.newTransaction, changes.data);
    saveDiffAndApply(changes.diff, changes, onChange);
    return changes.diff.added[0].id;
  }, []);

  const onSplit = useCallback(id => {
    const changes = splitTransaction(transactionsLatest.current, id);
    onChange(changes.newTransaction, changes.data);
    saveDiffAndApply(changes.diff, changes, onChange);
    return changes.diff.added[0].id;
  }, []);

  const onApplyRules = useCallback(async transaction => {
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
    }
    return newTransaction;
  }, []);

  const onManagePayees = useCallback(id => {
    navigate('/payees', { selectedPayee: id });
  });

  const onNavigateToTransferAccount = useCallback(accountId => {
    navigate(`/accounts/${accountId}`);
  });

  const onNavigateToSchedule = useCallback(scheduleId => {
    pushModal('schedule-edit', { id: scheduleId });
  });

  return (
    <TransactionTable
      ref={tableRef}
      pushModal={pushModal}
      transactions={allTransactions}
      loadMoreTransactions={loadMoreTransactions}
      accounts={accounts}
      categoryGroups={categoryGroups}
      payees={payees}
      showBalances={showBalances}
      balances={balances}
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
      addNotification={addNotification}
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
      onSort={onSort}
      sortField={sortField}
      ascDesc={ascDesc}
    />
  );
}
