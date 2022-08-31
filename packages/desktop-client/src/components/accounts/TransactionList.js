import React, { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  splitTransaction,
  updateTransaction,
  addSplitTransaction,
  realizeTempTransactions,
  applyTransactionDiff
} from 'loot-core/src/shared/transactions';
import { send } from 'loot-core/src/platform/client/fetch';
import { getChangedValues, applyChanges } from 'loot-core/src/shared/util';
import { TransactionTable } from './TransactionsTable';
import { useHistory } from 'react-router';
const uuid = require('loot-core/src/platform/uuid');

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
  let remoteUpdates = await send('transactions-batch-update', {
    ...diff,
    learnCategories: true
  });
  if (remoteUpdates.length > 0) {
    return { updates: remoteUpdates };
  }
  return {};
}

async function saveDiffAndApply(diff, changes, onChange) {
  let remoteDiff = await saveDiff(diff);
  onChange(
    applyTransactionDiff(changes.newTransaction, remoteDiff),
    applyChanges(remoteDiff, changes.data)
  );
}

export default function TransactionList({
  tableRef,
  transactions,
  allTransactions,
  loadMoreTransactions,
  account,
  accounts,
  categoryGroups,
  payees,
  balances,
  showAccount,
  headerContent,
  animated,
  isAdding,
  isNew,
  isMatched,
  isFiltered,
  dateFormat,
  addNotification,
  renderEmpty,
  onChange,
  onRefetch,
  onRefetchUpToRow,
  onCloseAddTransaction,
  onCreatePayee
}) {
  let dispatch = useDispatch();
  let table = useRef();
  let transactionsLatest = useRef();
  let scrollTo = useRef();
  let history = useHistory();

  // useEffect(() => {
  //   if (scrollTo.current) {
  //     // table.current.scrollTo(scrollTo.current);
  //   }
  // }, [transactions]);

  useEffect(clearScrollTo);

  useLayoutEffect(() => {
    transactionsLatest.current = transactions;
  }, [transactions]);

  function clearScrollTo() {
    scrollTo.current = null;
  }

  let onAdd = useCallback(async newTransactions => {
    newTransactions = realizeTempTransactions(newTransactions);

    await saveDiff({ added: newTransactions });
    onRefetch();
  }, []);

  let onSave = useCallback(async transaction => {
    let changes = updateTransaction(transactionsLatest.current, transaction);

    if (changes.diff.updated.length > 0) {
      let dateChanged = !!changes.diff.updated[0].date;
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

  let onAddSplit = useCallback(id => {
    const changes = addSplitTransaction(transactionsLatest.current, id);
    onChange(changes.newTransaction, changes.data);
    saveDiffAndApply(changes.diff, changes, onChange);
    return changes.diff.added[0].id;
  }, []);

  let onSplit = useCallback(id => {
    const changes = splitTransaction(transactionsLatest.current, id);
    onChange(changes.newTransaction, changes.data);
    saveDiffAndApply(changes.diff, changes, onChange);
    return changes.diff.added[0].id;
  }, []);

  let onApplyRules = useCallback(async transaction => {
    let afterRules = await send('rules-run', { transaction });
    let diff = getChangedValues(transaction, afterRules);

    let newTransaction = { ...transaction };
    if (diff) {
      Object.keys(diff).forEach(field => {
        if (
          newTransaction[field] == null ||
          newTransaction[field] === '' ||
          newTransaction[field] === 0
        ) {
          newTransaction[field] = diff[field];
        }
      });
    }
    return newTransaction;
  }, []);

  let onManagePayees = useCallback(
    id => {
      debugger;
      history.push('/payees', { selectedPayee: id });
    },
    [history]
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
      showAccount={showAccount}
      showCategory={true}
      animated={animated}
      currentAccountId={account && account.id}
      isAdding={isAdding}
      isNew={isNew}
      isMatched={isMatched}
      isFiltered={isFiltered}
      dateFormat={dateFormat}
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
      onScroll={clearScrollTo}
      style={{ backgroundColor: 'white' }}
    />
  );
}
