import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { runQuery } from 'loot-core/client/query-helpers';
import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import {
  deleteTransaction,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
  updateTransaction,
} from 'loot-core/shared/transactions';
import { applyChanges, type Diff } from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  type AccountEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useDispatch } from '../redux';

type BatchEditProps = {
  name: keyof TransactionEntity;
  ids: Array<TransactionEntity['id']>;
  onSuccess?: (
    ids: Array<TransactionEntity['id']>,
    name: keyof TransactionEntity,
    value: string | number | boolean | null,
    mode: 'prepend' | 'append' | 'replace' | null | undefined,
  ) => void;
};

type BatchDuplicateProps = {
  ids: Array<TransactionEntity['id']>;
  onSuccess?: (ids: Array<TransactionEntity['id']>) => void;
};

type BatchDeleteProps = {
  ids: Array<TransactionEntity['id']>;
  onSuccess?: (ids: Array<TransactionEntity['id']>) => void;
};

type BatchLinkScheduleProps = {
  ids: Array<TransactionEntity['id']>;
  account?: AccountEntity | undefined;
  onSuccess?: (
    ids: Array<TransactionEntity['id']>,
    schedule: ScheduleEntity,
  ) => void;
};

type BatchUnlinkScheduleProps = {
  ids: Array<TransactionEntity['id']>;
  onSuccess?: (ids: Array<TransactionEntity['id']>) => void;
};

export function useTransactionBatchActions() {
  const dispatch = useDispatch();

  const onBatchEdit = async ({ name, ids, onSuccess }: BatchEditProps) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data as TransactionEntity[]);

    const onChange = async (
      name: keyof TransactionEntity,
      value: string | number | boolean | null,
      mode?: 'prepend' | 'append' | 'replace' | null | undefined,
    ) => {
      let transactionsToChange = transactions;

      value = value === null ? '' : value;
      const changes: Diff<TransactionEntity> = {
        added: [],
        deleted: [],
        updated: [],
      };

      // Cleared is a special case right now
      if (name === 'cleared') {
        // Clear them if any are uncleared, otherwise unclear them
        value = !!transactionsToChange.find(t => !t.cleared);
      }

      const idSet = new Set(ids);

      transactionsToChange.forEach(trans => {
        if (name === 'cleared' && trans.reconciled) {
          // Skip transactions that are reconciled. Don't want to set them as
          // uncleared.
          return;
        }

        if (!idSet.has(trans.id)) {
          // Skip transactions which aren't actually selected, since the query
          // above also retrieves the siblings & parent of any selected splits.
          return;
        }

        let valueToSet = value;

        if (name === 'notes') {
          if (mode === 'prepend') {
            valueToSet =
              trans.notes === null ? value : value + ' ' + trans.notes;
          } else if (mode === 'append') {
            valueToSet =
              trans.notes === null ? value : trans.notes + ' ' + value;
          } else if (mode === 'replace') {
            valueToSet = value;
          }
        }
        const transaction = {
          ...trans,
          [name]: valueToSet,
        };

        if (name === 'account' && trans.account !== value) {
          transaction.reconciled = false;
        }

        const { diff } = updateTransaction(transactionsToChange, transaction);

        // TODO: We need to keep an updated list of transactions so
        // the logic in `updateTransaction`, particularly about
        // updating split transactions, works. This isn't ideal and we
        // should figure something else out
        transactionsToChange = applyChanges<TransactionEntity>(
          diff,
          transactionsToChange,
        );

        changes.deleted = changes.deleted
          ? changes.deleted.concat(diff.deleted)
          : diff.deleted;
        changes.updated = changes.updated
          ? changes.updated.concat(diff.updated)
          : diff.updated;
        changes.added = changes.added
          ? changes.added.concat(diff.added)
          : diff.added;
      });

      await send('transactions-batch-update', changes);

      onSuccess?.(ids, name, value, mode);
    };

    const pushPayeeAutocompleteModal = () => {
      dispatch(
        pushModal({
          modal: {
            name: 'payee-autocomplete',
            options: {
              onSelect: payeeId => onChange(name, payeeId),
            },
          },
        }),
      );
    };

    const pushAccountAutocompleteModal = () => {
      dispatch(
        pushModal({
          modal: {
            name: 'account-autocomplete',
            options: {
              onSelect: accountId => onChange(name, accountId),
            },
          },
        }),
      );
    };

    const pushEditField = () => {
      if (name !== 'date' && name !== 'amount' && name !== 'notes') {
        return;
      }

      dispatch(
        pushModal({
          modal: {
            name: 'edit-field',
            options: {
              name,
              onSubmit: (name, value, mode) => onChange(name, value, mode),
            },
          },
        }),
      );
    };

    const pushCategoryAutocompleteModal = () => {
      // Only show balances when all selected transaction are in the same month.
      const transactionMonth = transactions[0]?.date
        ? monthUtils.monthFromDate(transactions[0]?.date)
        : null;
      const transactionsHaveSameMonth =
        transactionMonth &&
        transactions.every(
          t => monthUtils.monthFromDate(t.date) === transactionMonth,
        );
      dispatch(
        pushModal({
          modal: {
            name: 'category-autocomplete',
            options: {
              month: transactionsHaveSameMonth ? transactionMonth : undefined,
              onSelect: categoryId => onChange(name, categoryId),
            },
          },
        }),
      );
    };

    if (
      name === 'amount' ||
      name === 'payee' ||
      name === 'account' ||
      name === 'date'
    ) {
      const reconciledTransactions = transactions.filter(t => t.reconciled);
      if (reconciledTransactions.length > 0) {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transaction-edit',
              options: {
                onConfirm: () => {
                  if (name === 'payee') {
                    pushPayeeAutocompleteModal();
                  } else if (name === 'account') {
                    pushAccountAutocompleteModal();
                  } else {
                    pushEditField();
                  }
                },
                confirmReason: 'batchEditWithReconciled',
              },
            },
          }),
        );
        return;
      }
    }

    if (name === 'cleared') {
      // Cleared just toggles it on/off and it depends on the data
      // loaded. Need to clean this up in the future.
      onChange('cleared', null);
    } else if (name === 'category') {
      pushCategoryAutocompleteModal();
    } else if (name === 'payee') {
      pushPayeeAutocompleteModal();
    } else if (name === 'account') {
      pushAccountAutocompleteModal();
    } else {
      pushEditField();
    }
  };

  const onBatchDuplicate = async ({ ids, onSuccess }: BatchDuplicateProps) => {
    const onConfirmDuplicate = async (ids: Array<TransactionEntity['id']>) => {
      const { data } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*')
          .options({ splits: 'grouped' }),
      );

      const transactions = data as TransactionEntity[];

      const changes = {
        added: transactions
          .reduce(
            (
              newTransactions: TransactionEntity[],
              trans: TransactionEntity,
            ) => {
              return newTransactions.concat(
                realizeTempTransactions(ungroupTransaction(trans)),
              );
            },
            [],
          )
          .map(({ sort_order, ...trans }: TransactionEntity) => ({ ...trans })),
      };

      await send('transactions-batch-update', changes);

      onSuccess?.(ids);
    };

    await checkForReconciledTransactions(
      ids,
      'batchDuplicateWithReconciled',
      onConfirmDuplicate,
    );
  };

  const onBatchDelete = async ({ ids, onSuccess }: BatchDeleteProps) => {
    const onConfirmDelete = (ids: Array<TransactionEntity['id']>) => {
      dispatch(
        pushModal({
          modal: {
            name: 'confirm-transaction-delete',
            options: {
              message:
                ids.length > 1
                  ? `Are you sure you want to delete these ${ids.length} transaction${ids.length > 1 ? 's' : ''}?`
                  : undefined,
              onConfirm: async () => {
                const { data } = await runQuery(
                  q('transactions')
                    .filter({ id: { $oneof: ids } })
                    .select('*')
                    .options({ splits: 'grouped' }),
                );
                let transactions = ungroupTransactions(
                  data as TransactionEntity[],
                );

                const idSet = new Set(ids);
                const changes: Diff<TransactionEntity> = {
                  added: [],
                  deleted: [],
                  updated: [],
                };

                transactions.forEach(trans => {
                  const parentId = trans.parent_id;

                  // First, check if we're actually deleting this transaction by
                  // checking `idSet`. Then, we don't need to do anything if it's
                  // a child transaction and the parent is already being deleted
                  if (
                    !idSet.has(trans.id) ||
                    (parentId && idSet.has(parentId))
                  ) {
                    return;
                  }

                  const { diff } = deleteTransaction(transactions, trans.id);

                  // TODO: We need to keep an updated list of transactions so
                  // the logic in `updateTransaction`, particularly about
                  // updating split transactions, works. This isn't ideal and we
                  // should figure something else out
                  transactions = applyChanges<TransactionEntity>(
                    diff,
                    transactions,
                  );

                  changes.deleted = diff.deleted
                    ? changes.deleted.concat(diff.deleted)
                    : diff.deleted;
                  changes.updated = diff.updated
                    ? changes.updated.concat(diff.updated)
                    : diff.updated;
                });

                await send('transactions-batch-update', changes);
                onSuccess?.(ids);
              },
            },
          },
        }),
      );
    };

    await checkForReconciledTransactions(
      ids,
      'batchDeleteWithReconciled',
      onConfirmDelete,
    );
  };

  const onBatchLinkSchedule = async ({
    ids,
    account,
    onSuccess,
  }: BatchLinkScheduleProps) => {
    const { data: transactions } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    dispatch(
      pushModal({
        modal: {
          name: 'schedule-link',
          options: {
            transactionIds: ids,
            getTransaction: (id: TransactionEntity['id']) =>
              transactions.find((t: TransactionEntity) => t.id === id),
            accountName: account?.name ?? '',
            onScheduleLinked: schedule => {
              onSuccess?.(ids, schedule);
            },
          },
        },
      }),
    );
  };

  const onBatchUnlinkSchedule = async ({
    ids,
    onSuccess,
  }: BatchUnlinkScheduleProps) => {
    const changes = {
      updated: ids.map(
        id => ({ id, schedule: null }) as unknown as Partial<TransactionEntity>,
      ),
    };
    await send('transactions-batch-update', changes);
    onSuccess?.(ids);
  };

  const checkForReconciledTransactions = async (
    ids: Array<TransactionEntity['id']>,
    confirmReason: string,
    onConfirm: (ids: Array<TransactionEntity['id']>) => void,
  ) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids }, reconciled: true })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data as TransactionEntity[]);
    if (transactions.length > 0) {
      dispatch(
        pushModal({
          modal: {
            name: 'confirm-transaction-edit',
            options: {
              onConfirm: () => {
                onConfirm(ids);
              },
              confirmReason,
            },
          },
        }),
      );
    } else {
      onConfirm(ids);
    }
  };

  return {
    onBatchEdit,
    onBatchDuplicate,
    onBatchDelete,
    onBatchLinkSchedule,
    onBatchUnlinkSchedule,
  };
}
