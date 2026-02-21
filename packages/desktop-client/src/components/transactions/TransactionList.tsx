// @ts-strict-ignore
// TODO: remove strict
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { getUpcomingDays } from 'loot-core/shared/schedules';
import {
  addSplitTransaction,
  applyTransactionDiff,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction,
} from 'loot-core/shared/transactions';
import { applyChanges, getChangedValues } from 'loot-core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  RuleActionEntity,
  RuleConditionEntity,
  ScheduleEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from 'loot-core/types/models';

import { TransactionTable } from './TransactionsTable';
import type { TransactionTableProps } from './TransactionsTable';

import type { TableHandleRef } from '@desktop-client/components/table';
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

export async function createSingleTimeScheduleFromTransaction(
  transaction: TransactionEntity,
): Promise<ScheduleEntity['id']> {
  const conditions: RuleConditionEntity[] = [
    { op: 'is', field: 'date', value: transaction.date },
  ];

  const actions: RuleActionEntity[] = [];

  const conditionFields = ['amount', 'payee', 'account'];

  conditionFields.forEach(field => {
    const value = transaction[field];
    if (value != null && value !== '') {
      conditions.push({
        op: 'is',
        field,
        value,
      } as RuleConditionEntity);
    }
  });

  if (transaction.is_parent && transaction.subtransactions) {
    if (transaction.notes) {
      actions.push({
        op: 'set',
        field: 'notes',
        value: transaction.notes,
        options: {
          splitIndex: 0,
        },
      } as RuleActionEntity);
    }

    transaction.subtransactions.forEach((split, index) => {
      const splitIndex = index + 1;

      if (split.amount != null) {
        actions.push({
          op: 'set-split-amount',
          value: split.amount,
          options: {
            splitIndex,
            method: 'fixed-amount',
          },
        } as RuleActionEntity);
      }

      if (split.category) {
        actions.push({
          op: 'set',
          field: 'category',
          value: split.category,
          options: {
            splitIndex,
          },
        } as RuleActionEntity);
      }

      if (split.notes) {
        actions.push({
          op: 'set',
          field: 'notes',
          value: split.notes,
          options: {
            splitIndex,
          },
        } as RuleActionEntity);
      }
    });
  } else {
    if (transaction.category) {
      actions.push({
        op: 'set',
        field: 'category',
        value: transaction.category,
      } as RuleActionEntity);
    }

    if (transaction.notes) {
      actions.push({
        op: 'set',
        field: 'notes',
        value: transaction.notes,
      } as RuleActionEntity);
    }
  }

  const formattedDate = monthUtils.format(transaction.date, 'MMM dd, yyyy');
  const timestamp = Date.now();
  const scheduleName = `Auto-created future transaction (${formattedDate}) - ${timestamp}`;

  const scheduleId = await send('schedule/create', {
    conditions,
    schedule: {
      posts_transaction: true,
      name: scheduleName,
    },
  });

  if (actions.length > 0) {
    const schedules = await send(
      'query',
      q('schedules').filter({ id: scheduleId }).select('rule').serialize(),
    );

    const ruleId = schedules?.data?.[0]?.rule;

    if (ruleId) {
      const rule = await send('rule-get', { id: ruleId });

      if (rule) {
        const linkScheduleActions = rule.actions.filter(
          a => a.op === 'link-schedule',
        );

        await send('rule-update', {
          ...rule,
          actions: [...linkScheduleActions, ...actions],
        });
      }
    }
  }

  return scheduleId;
}

function isFutureTransaction(transaction: TransactionEntity): boolean {
  const today = monthUtils.currentDay();
  return transaction.date > today;
}

function calculateFutureTransactionInfo(
  transaction: TransactionEntity,
  upcomingLength: string,
) {
  const today = monthUtils.currentDay();
  const upcomingDays = getUpcomingDays(upcomingLength, today);
  const daysUntilTransaction = monthUtils.differenceInCalendarDays(
    transaction.date,
    today,
  );
  const isBeyondWindow = daysUntilTransaction > upcomingDays;

  return {
    isBeyondWindow,
    daysUntilTransaction,
    upcomingDays,
  };
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

  const promptToConvertToSchedule = useCallback(
    (
      transaction: TransactionEntity,
      onConfirm: () => Promise<void>,
      onCancel: () => Promise<void>,
    ) => {
      const futureInfo = calculateFutureTransactionInfo(
        transaction,
        upcomingLength,
      );

      dispatch(
        pushModal({
          modal: {
            name: 'convert-to-schedule',
            options: {
              ...futureInfo,
              onConfirm: async () => {
                await onConfirm();
                dispatch(
                  addNotification({
                    notification: {
                      type: 'message',
                      message: t('Schedule created successfully'),
                    },
                  }),
                );
                onRefetch();
              },
              onCancel: async () => {
                await onCancel();
                onRefetch();
              },
            },
          },
        }),
      );
    },
    [dispatch, onRefetch, upcomingLength, t],
  );

  const onAdd = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      newTransactions = realizeTempTransactions(newTransactions);

      const parentTransaction = newTransactions.find(t => !t.is_child);
      const isLinkedToSchedule = !!parentTransaction?.schedule;

      if (
        parentTransaction &&
        isFutureTransaction(parentTransaction) &&
        !isLinkedToSchedule
      ) {
        const transactionWithSubtransactions = {
          ...parentTransaction,
          subtransactions: newTransactions.filter(
            t => t.is_child && t.parent_id === parentTransaction.id,
          ),
        };

        promptToConvertToSchedule(
          transactionWithSubtransactions,
          async () => {
            await createSingleTimeScheduleFromTransaction(
              transactionWithSubtransactions,
            );
          },
          async () => {
            await saveDiff(
              { added: newTransactions },
              isLearnCategoriesEnabled,
            );
          },
        );
        return;
      }

      await saveDiff({ added: newTransactions }, isLearnCategoriesEnabled);
      onRefetch();
    },
    [isLearnCategoriesEnabled, onRefetch, promptToConvertToSchedule],
  );

  const onSave = useCallback(
    async (transaction: TransactionEntity) => {
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

      const isLinkedToSchedule = !!transaction.schedule;
      if (isFutureTransaction(transaction) && !isLinkedToSchedule) {
        const originalTransaction = transactionsLatest.current.find(
          t => t.id === transaction.id,
        );
        const dateChanged =
          !originalTransaction || originalTransaction.date !== transaction.date;

        if (dateChanged || !originalTransaction) {
          promptToConvertToSchedule(
            transaction,
            async () => {
              if (transaction.id && !transaction.id.startsWith('temp')) {
                await send('transaction-delete', { id: transaction.id });
              }

              await createSingleTimeScheduleFromTransaction(transaction);
            },
            saveTransaction,
          );
          return;
        }
      }

      await saveTransaction();
    },
    [isLearnCategoriesEnabled, onChange, onRefetch, promptToConvertToSchedule],
  );

  const onAddSplit = useCallback(
    (id: TransactionEntity['id']) => {
      const changes = addSplitTransaction(transactionsLatest.current, id);
      onChange(changes.newTransaction, changes.data);
      void saveDiffAndApply(
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
      void saveDiffAndApply(
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
      void navigate(
        '/payees',
        id ? { state: { selectedPayee: id } } : undefined,
      );
    },
    [navigate],
  );

  const onNavigateToTransferAccount = useCallback(
    (accountId: AccountEntity['id']) => {
      void navigate(`/accounts/${accountId}`);
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
