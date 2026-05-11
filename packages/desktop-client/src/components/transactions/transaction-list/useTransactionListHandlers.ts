// @ts-strict-ignore
// TODO: remove strict
import { useCallback } from 'react';
import type { RefObject } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import {
  addSplitTransaction,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import type {
  AccountEntity,
  PayeeEntity,
  RuleConditionEntity,
  ScheduleEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';

import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';

import {
  applyRulesToTransaction,
  saveDiff,
  saveDiffAndApply,
} from './mutations';
import { getTransactionMovePayload } from './reorder';
import {
  calculateFutureTransactionInfo,
  createSingleTimeScheduleFromTransaction,
  isFutureTransaction,
} from './schedule';

type UseTransactionListHandlersProps = {
  transactionsLatest: RefObject<readonly TransactionEntity[]>;
  allTransactions: TransactionEntity[];
  sortField: string;
  ascDesc: 'asc' | 'desc';
  isFiltered?: boolean;
  isLearnCategoriesEnabled: boolean;
  upcomingLength: string;
  dispatch: (action: unknown) => void;
  navigate: (url: string, options?: unknown) => void | Promise<void>;
  t: (value: string) => string;
  onChange: (
    transaction: TransactionEntity,
    transactions: TransactionEntity[],
  ) => void;
  onRefetch: () => void;
  onApplyFilter: (
    filter: Partial<RuleConditionEntity> | TransactionFilterEntity,
  ) => void;
};

export function useTransactionListHandlers({
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
}: UseTransactionListHandlersProps) {
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
    [dispatch, onRefetch, t, upcomingLength],
  );

  const onAdd = useCallback(
    async (newTransactions: TransactionEntity[]) => {
      newTransactions = realizeTempTransactions(newTransactions);

      const parentTransaction = newTransactions.find(
        transaction => !transaction.is_child,
      );
      const isLinkedToSchedule = !!parentTransaction?.schedule;

      if (
        parentTransaction &&
        isFutureTransaction(parentTransaction) &&
        !isLinkedToSchedule
      ) {
        const transactionWithSubtransactions = {
          ...parentTransaction,
          subtransactions: newTransactions.filter(
            transaction =>
              transaction.is_child &&
              transaction.parent_id === parentTransaction.id,
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
          existingTransaction => existingTransaction.id === transaction.id,
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
    [
      isLearnCategoriesEnabled,
      onChange,
      onRefetch,
      promptToConvertToSchedule,
      transactionsLatest,
    ],
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
    [isLearnCategoriesEnabled, onChange, transactionsLatest],
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
    [isLearnCategoriesEnabled, onChange, transactionsLatest],
  );

  const onApplyRules = useCallback(
    async (
      transaction: TransactionEntity,
      updatedFieldName: string | null = null,
    ) =>
      applyRulesToTransaction(transaction, updatedFieldName, errors => {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: `Formula errors in rules:\n${errors.join('\n')}`,
              sticky: true,
            },
          }),
        );
      }),
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

  const onReorder = useCallback(
    async (id: string, dropPos, targetId: string) => {
      const movePayload = getTransactionMovePayload({
        allTransactions,
        id,
        dropPos,
        targetId,
        sortField,
        ascDesc,
        isFiltered,
      });

      if (!movePayload) {
        return;
      }

      await send('transaction-move', movePayload);
      onRefetch();
    },
    [allTransactions, ascDesc, isFiltered, onRefetch, sortField],
  );

  return {
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
  };
}
