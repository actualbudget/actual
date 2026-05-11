// @ts-strict-ignore
// TODO: remove strict
import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import type {
  AccountEntity,
  CategoryEntity,
  RuleConditionEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import type { TableHandleRef } from '#components/table';
import { useNavigate } from '#hooks/useNavigate';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useDispatch } from '#redux';

import { useTransactionListHandlers } from './transaction-list/useTransactionListHandlers';
import { TransactionTable } from './TransactionTable';
import type { TransactionTableProps } from './TransactionTable';

export { createSingleTimeScheduleFromTransaction } from './transaction-list/schedule';

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
  isFiltered?: boolean;
  allowReorder?: boolean;
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
  isFiltered,
  allowReorder = true,
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
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';
  const [upcomingLength = '7'] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );

  const transactionsLatest = useRef<readonly TransactionEntity[]>([]);
  useLayoutEffect(() => {
    transactionsLatest.current = transactions;
  }, [transactions]);

  const {
    onAdd,
    onSave,
    onAddSplit,
    onSplit,
    onApplyRules,
    onManagePayees,
    onNavigateToTransferAccount,
    onNavigateToSchedule,
    onNotesTagClick,
    onReorder,
  } = useTransactionListHandlers({
    transactionsLatest,
    allTransactions,
    sortField,
    ascDesc,
    isFiltered,
    isLearnCategoriesEnabled,
    upcomingLength,
    dispatch,
    navigate,
    t,
    onChange,
    onRefetch,
    onApplyFilter,
  });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
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
        showCategory
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
        isFiltered={isFiltered}
        onReorder={allowReorder ? onReorder : undefined}
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
    </ErrorBoundary>
  );
}
