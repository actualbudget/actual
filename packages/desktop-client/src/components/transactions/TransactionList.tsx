// @ts-strict-ignore
// TODO: remove strict
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import {
  addSplitTransaction,
  applyTransactionDiff,
  deleteTransaction,
  isPreviewId,
  makeEmptySplitSubtransactions,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import { applyChanges } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  RuleConditionEntity,
  ScheduleEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';

import { fromRegisterView, toForeignDraft } from '#accounts/registerView';
import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import type { TableHandleRef } from '#components/table';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { isValidBoundaryDrop } from '#hooks/useDragDrop';
import type { DropPosition } from '#hooks/useDragDrop';
import { useNavigate } from '#hooks/useNavigate';
import { useSplitsExpanded } from '#hooks/useSplitsExpanded';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import type { ExchangeRequest } from '#util/exchange-entry';
import {
  isExchangeRow,
  openForeignEditDialog,
  setInlineForeignSplitEdit,
} from '#util/foreign-edit';
import { postForeignEntry } from '#util/post-foreign-entry';

import { applyRulesToTransaction } from './applyRulesToTransaction';
import type { ExchangePostResult } from './ExchangePanel';
import { InlineForeignSplit } from './InlineForeignSplit';
import type { InlineForeignSplitDraft } from './InlineForeignSplit';
import type { ClearedFieldsByTransaction } from './table/utils';
import { TransactionTable } from './TransactionsTable';
import type { TransactionTableProps } from './TransactionsTable';
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

  if (remoteUpdates && remoteUpdates.updated.length > 0) {
    return { updates: remoteUpdates };
  }
  return {};
}

async function saveDiffAndApply(diff, changes, onChange, learnCategories) {
  const remoteDiff = await saveDiff(diff, learnCategories);
  onChange(
    // TODO:
    // @ts-expect-error - fix me
    applyTransactionDiff(changes.newTransaction, remoteDiff),
    // @ts-expect-error - fix me
    applyChanges(remoteDiff, changes.data),
  );
}

type TransactionListProps = Pick<
  TransactionTableProps,
  | 'accounts'
  | 'allowSplitTransaction'
  | 'ascDesc'
  | 'balances'
  | 'categoryGroups'
  | 'dateFormat'
  | 'focusedTransactionId'
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
  | 'onFocusedTransactionShown'
  | 'onMakeAsNonSplitTransactions'
  | 'onSort'
  | 'onScheduleAction'
  | 'payees'
  | 'renderEmpty'
  | 'showAccount'
  | 'showBalances'
  | 'showCleared'
  | 'showGroup'
  | 'showReconciled'
  | 'showSelection'
  | 'columnOrder'
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
  showGroup,
  showAccount,
  columnOrder,
  isAdding,
  isNew,
  isMatched,
  isFiltered,
  allowReorder = true,
  dateFormat,
  hideFraction,
  renderEmpty,
  focusedTransactionId,
  onFocusedTransactionShown,
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
  const { t } = useTranslation();
  const splitsExpanded = useSplitsExpanded();
  const navigate = useNavigate();
  const [splitSaving, setSplitSaving] = useState(false);
  const [splitDraft, setSplitDraft] = useState<InlineForeignSplitDraft | null>(
    null,
  );
  const [learnCategories = 'true'] = useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  const transactionsLatest = useRef<readonly TransactionEntity[]>([]);
  useLayoutEffect(() => {
    transactionsLatest.current = splitDraft?.rows ?? transactions;
  }, [transactions, splitDraft]);

  const onAdd = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      newTransactions = realizeTempTransactions(newTransactions);
      const [parent] = newTransactions;
      // A foreign register's draft carries its native amount in `amount`;
      // it is posted only through the atomic foreign entry handler.
      if (
        account?.currency &&
        account.currency_precision != null &&
        parent?.account === account.id
      ) {
        const draft = toForeignDraft(parent);
        await postForeignEntry(dispatch, {
          transaction: draft,
          currencyCode: account.currency,
          nativePrecision: account.currency_precision,
          onPosted: onRefetch,
        });
        return;
      }
      await saveDiff({ added: newTransactions }, isLearnCategoriesEnabled);
      onRefetch();
    },
    [account, dispatch, isLearnCategoriesEnabled, onRefetch],
  );

  // Exchange transfers post atomically from the register's inline panel.
  const onAddExchange = async (
    request: ExchangeRequest,
  ): Promise<ExchangePostResult> => {
    try {
      const result = await send('transactions/post-exchange-transfer', request);
      if (result.status === 'ok') {
        onRefetch();
        return { status: 'ok' };
      }
      return { status: 'rate-unavailable', currencies: result.currencies };
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };

  /**
   * Opens the edit dialog for a changed amount that only a foreign or
   * exchange handler may save, returning true when it did. The register
   * reloads the stored rows; the dialog saves the edit.
   */
  const openForeignEdit = async (transaction: TransactionEntity) => {
    const rows = transactionsLatest.current;
    const stored = rows.find(row => row.id === transaction.id);
    if (!stored || transaction.amount === stored.amount) return false;
    // A native register edits the native amount; a base register edits the
    // base value and keeps the native amount.
    const nativeView = stored._baseAmount !== undefined;
    const opened = await openForeignEditDialog(dispatch, {
      row: fromRegisterView([stored])[0],
      rows: fromRegisterView([...rows]),
      payees,
      accounts,
      ...(nativeView
        ? { native: transaction.amount }
        : { baseAmount: transaction.amount }),
      onSaved: onRefetch,
    });
    if (opened) onRefetch();
    return opened;
  };

  function stageForeignSplit(id: string, rows: TransactionEntity[]) {
    const current = transactionsLatest.current;
    const row = current.find(r => r.id === id);
    if (!row || !accounts.find(a => a.id === row.account)?.currency) {
      return false;
    }
    const parentId = row.is_child ? row.parent_id : row.id;
    const family = current.filter(
      r => r.id === parentId || r.parent_id === parentId,
    );
    if (
      isExchangeRow(row, current, payees, accounts) ||
      family.some(r => r.transfer_id)
    ) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Transfers cannot be part of a split in this account.'),
          },
        }),
      );
      return true;
    }
    if (splitDraft && splitDraft.id !== parentId) return true;
    rows = rows.map(r => {
      if (
        (r.id !== parentId && r.parent_id !== parentId) ||
        r._baseAmount !== undefined
      ) {
        return r;
      }
      const stored = current.find(existing => existing.id === r.id);
      return {
        ...r,
        amount: stored?.transaction_amount ?? r.amount,
        _baseAmount: stored?.amount ?? 0,
      };
    });
    setSplitDraft({
      id: parentId,
      original: splitDraft?.original ?? family,
      rows,
    });
    transactionsLatest.current = rows;
    onChange(
      rows.find(r => r.id === parentId),
      rows,
    );
    return true;
  }

  useEffect(() =>
    setInlineForeignSplitEdit(id => {
      stageForeignSplit(id, [...transactionsLatest.current]);
      splitsExpanded.dispatch({ type: 'open-split', id });
    }),
  );

  function cancelSplitDraft() {
    if (!splitDraft) return;
    const rows = [...splitDraft.rows];
    const index = rows.findIndex(r => r.id === splitDraft.id);
    const familySize = rows.filter(
      r => r.id === splitDraft.id || r.parent_id === splitDraft.id,
    ).length;
    rows.splice(index, familySize, ...splitDraft.original);
    onChange(splitDraft.original[0], rows);
    setSplitDraft(null);
    onRefetch();
  }

  const onSave = async (transaction: TransactionEntity) => {
    const stored = transactionsLatest.current.find(
      r => r.id === transaction.id,
    );
    if (splitDraft && stored && transaction.account !== stored.account) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t(
              'Save or cancel the split edits before moving this transaction.',
            ),
          },
        }),
      );
      return;
    }
    if (
      !splitDraft &&
      stored?._baseAmount === undefined &&
      stored?.amount !== transaction.amount &&
      (await openForeignEdit(transaction))
    ) {
      return;
    }
    if (stored && (stored.is_parent || stored.is_child)) {
      const changes = updateTransaction(
        transactionsLatest.current,
        transaction,
      );
      if (stageForeignSplit(transaction.id, changes.data)) return;
    }
    if (await openForeignEdit(transaction)) return;
    const saveTransaction = async () => {
      const changes = updateTransaction(
        transactionsLatest.current,
        transaction,
      );
      transactionsLatest.current = changes.data;

      if (changes.diff.updated.length > 0) {
        const dateChanged = !!changes.diff.updated[0].date;
        if (dateChanged) {
          changes.diff.updated[0].sort_order = Date.now();
          await saveDiff(changes.diff, isLearnCategoriesEnabled);
          onRefetch();
        } else {
          onChange(changes.newTransaction, changes.data);
          void saveDiffAndApply(
            changes.diff,
            changes,
            onChange,
            isLearnCategoriesEnabled,
          );
        }
      }
    };

    await saveTransaction();
  };

  const onAddSplit = (id: TransactionEntity['id']) => {
    const changes = addSplitTransaction(transactionsLatest.current, id);
    if (stageForeignSplit(id, changes.data)) {
      return changes.diff.added[0]?.id ?? null;
    }
    onChange(changes.newTransaction, changes.data);
    void saveDiffAndApply(
      changes.diff,
      changes,
      onChange,
      isLearnCategoriesEnabled,
    );
    return changes.diff.added[0].id;
  };

  const onSplit = (id: TransactionEntity['id']) => {
    const changes = splitTransaction(
      transactionsLatest.current,
      id,
      makeEmptySplitSubtransactions,
    );
    if (stageForeignSplit(id, changes.data)) {
      return changes.diff.added[0]?.id ?? null;
    }
    onChange(changes.newTransaction, changes.data);
    void saveDiffAndApply(
      changes.diff,
      changes,
      onChange,
      isLearnCategoriesEnabled,
    );
    return changes.diff.added[0].id;
  };

  const onApplyRules = useCallback(
    async (
      transaction: TransactionEntity,
      updatedFieldName: string | null = null,
      clearedFields?: ClearedFieldsByTransaction,
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

      return applyRulesToTransaction(
        transaction,
        afterRules,
        updatedFieldName,
        clearedFields,
      );
    },
    [dispatch],
  );

  const onManagePayees = useCallback(
    (id: PayeeEntity['id']) => {
      void navigate(
        '/settings/payees',
        id ? { state: { selectedPayee: id } } : undefined,
      );
    },
    [navigate],
  );

  const onNavigateToTransferAccount = useCallback(
    (
      accountId: AccountEntity['id'],
      transactionId?: TransactionEntity['id'],
    ) => {
      void navigate(
        `/accounts/${accountId}`,
        transactionId
          ? { state: { focusTransactionId: transactionId } }
          : undefined,
      );
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

  const onReorder = useCallback(
    async (id: string, dropPos: DropPosition, targetId: string) => {
      // Don't support reorder while sorted by non-date field or filtered
      if ((sortField && sortField !== 'date') || isFiltered) {
        return;
      }

      if (id === targetId) {
        return;
      }

      // Find the transaction being dragged to determine if it's a child
      const draggedTrans = allTransactions.find(t => t.id === id);
      if (!draggedTrans) {
        return;
      }

      // Preview (upcoming schedule) reordering: only against other
      // previews on the same date. Never mix preview and real transactions.
      if (isPreviewId(id) !== isPreviewId(targetId)) {
        return;
      }
      if (isPreviewId(id)) {
        const targetTrans = allTransactions.find(t => t.id === targetId);
        if (!targetTrans || targetTrans.date !== draggedTrans.date) {
          return;
        }

        const previews = allTransactions.filter(
          t => isPreviewId(t.id) && t.date === draggedTrans.date,
        );
        const targetIdx = previews.findIndex(t => t.id === targetId);
        if (targetIdx === -1) {
          return;
        }

        let apiTargetId: string | null;
        if (dropPos === 'after') {
          apiTargetId = targetTrans.schedule ?? null;
        } else {
          const aboveIdx = targetIdx - 1;
          apiTargetId =
            aboveIdx >= 0 ? (previews[aboveIdx].schedule ?? null) : null;
        }

        if (!draggedTrans.schedule) {
          return;
        }

        await send('schedule/move', {
          id: draggedTrans.schedule,
          targetId: apiTargetId,
        });
        onRefetch();
        return;
      }

      // Child transaction reordering: siblings only
      if (draggedTrans.is_child && draggedTrans.parent_id) {
        const siblings = allTransactions.filter(
          t => t.parent_id === draggedTrans.parent_id && !isPreviewId(t.id),
        );

        const targetTransIdx = siblings.findIndex(t => t.id === targetId);
        if (targetTransIdx === -1) {
          return; // Target is not a sibling
        }

        // Convert dropPos to API targetId for child reordering
        // API places transaction AFTER targetId; null means move to top of siblings
        let apiTargetId: string | null;
        if (dropPos === 'after') {
          apiTargetId = targetId;
        } else {
          const aboveIdx = targetTransIdx - 1;
          apiTargetId = aboveIdx >= 0 ? siblings[aboveIdx].id : null;
        }

        await send('transaction-move', {
          id,
          accountId: draggedTrans.account,
          targetId: apiTargetId,
        });
        onRefetch();
        return;
      }

      // Build a reorderable list that excludes child and preview/scheduled transactions
      const reorderable = allTransactions.filter(
        t => !t.is_child && !isPreviewId(t.id),
      );

      const transIdx = reorderable.findIndex(t => t.id === id);
      const targetTransIdx = reorderable.findIndex(t => t.id === targetId);

      if (transIdx === -1 || targetTransIdx === -1) {
        return;
      }

      const trans = reorderable[transIdx];
      const targetTrans = reorderable[targetTransIdx];
      const isAscending = sortField === 'date' && ascDesc === 'asc';

      // Validate drop position: same date or at a date boundary
      let isValidDrop = targetTrans.date === trans.date;
      if (!isValidDrop) {
        const neighborIdx =
          dropPos === 'before' ? targetTransIdx - 1 : targetTransIdx + 1;
        const neighborTrans =
          neighborIdx >= 0 && neighborIdx < reorderable.length
            ? reorderable[neighborIdx]
            : null;
        isValidDrop = isValidBoundaryDrop(
          dropPos,
          targetTrans.date,
          trans.date,
          neighborTrans?.date ?? null,
          isAscending,
        );
      }

      if (!isValidDrop) {
        return;
      }

      // Convert dropPos to API targetId
      // API places transaction AFTER targetId; null means move to top
      let apiTargetId: string | null;
      if (dropPos === 'after') {
        // Prevent inserting immediately after a split parent
        if (targetTrans.is_parent) {
          return;
        }
        apiTargetId = targetTrans.date === trans.date ? targetId : null;
      } else {
        const aboveIdx = targetTransIdx - 1;
        const aboveTrans = aboveIdx >= 0 ? reorderable[aboveIdx] : null;
        // For parent-level reordering, always anchor to parent transactions.
        // Using a child id here makes the backend miss the target and append.
        if (aboveTrans?.is_parent) {
          apiTargetId = aboveTrans.date === trans.date ? aboveTrans.id : null;
        } else {
          apiTargetId =
            aboveTrans && aboveTrans.date === trans.date ? aboveTrans.id : null;
        }
      }

      await send('transaction-move', {
        id,
        accountId: trans.account,
        targetId: apiTargetId,
      });
      onRefetch();
    },
    [sortField, ascDesc, isFiltered, allTransactions, onRefetch],
  );

  const splitAccount = splitDraft
    ? accounts.find(a => a.id === splitDraft.original[0].account)
    : null;
  const mixedSplit = !!splitDraft && !account?.currency;
  const table = (
    <TransactionTable
      ref={tableRef}
      transactions={
        mixedSplit
          ? splitDraft.rows.filter(
              r => r.id === splitDraft.id || r.parent_id === splitDraft.id,
            )
          : (splitDraft?.rows ?? allTransactions)
      }
      focusedTransactionId={focusedTransactionId}
      onFocusedTransactionShown={onFocusedTransactionShown}
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
      showGroup={showGroup}
      columnOrder={columnOrder}
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
      onAddExchange={account ? onAddExchange : undefined}
      rowDetails={
        splitDraft && splitAccount
          ? {
              id: splitDraft.id,
              content: (
                <InlineForeignSplit
                  key={splitDraft.id}
                  draft={splitDraft}
                  account={splitAccount}
                  onBusyChange={setSplitSaving}
                  onCancel={cancelSplitDraft}
                  onSaved={cancelSplitDraft}
                />
              ),
            }
          : undefined
      }
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
      onReorder={allowReorder && !splitDraft ? onReorder : undefined}
      onBatchDelete={ids => {
        if (ids.length === 1) {
          const row = transactionsLatest.current.find(r => r.id === ids[0]);
          if (row?.is_child) {
            const changes = deleteTransaction(
              [...transactionsLatest.current],
              row.id,
            );
            if (stageForeignSplit(row.id, changes.data)) return;
          }
        }
        onBatchDelete(ids);
      }}
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

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <div inert={splitSaving} style={{ display: 'contents' }}>
        {mixedSplit && splitAccount ? (
          <CurrencyFormatProvider
            currencyCode={splitAccount.currency}
            precision={splitAccount.currency_precision}
          >
            {table}
          </CurrencyFormatProvider>
        ) : (
          table
        )}
      </div>
    </ErrorBoundary>
  );
}
