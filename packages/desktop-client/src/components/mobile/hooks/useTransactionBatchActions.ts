import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
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
import {
  applyChanges,
  integerToCurrency,
  type Diff,
} from 'loot-core/shared/util';
import * as monthUtils from 'loot-core/src/shared/months';
import { type TransactionEntity } from 'loot-core/types/models';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import { useUndo } from '../../../hooks/useUndo';

export function useTransactionBatchActions() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const accounts = useAccounts();
  const payees = usePayees();
  const { list: categories } = useCategories();

  const { showUndoNotification } = useUndo();

  const onBatchEdit = async (
    name: keyof TransactionEntity,
    ids: Array<TransactionEntity['id']>,
  ) => {
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

      const newValue = value === null ? '' : value;
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

        if (name === 'notes') {
          if (mode === 'prepend') {
            value =
              trans.notes === null ? newValue : newValue + ' ' + trans.notes;
          } else if (mode === 'append') {
            value =
              trans.notes === null ? newValue : trans.notes + ' ' + newValue;
          } else if (mode === 'replace') {
            value = newValue;
          }
        }
        const transaction = {
          ...trans,
          [name]: value,
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

      let displayValue = value;
      switch (name) {
        case 'account':
          displayValue = accounts.find(a => a.id === value)?.name ?? value;
          break;
        case 'category':
          displayValue = categories.find(c => c.id === value)?.name ?? value;
          break;
        case 'payee':
          displayValue = payees.find(p => p.id === value)?.name ?? value;
          break;
        case 'amount':
          displayValue = integerToCurrency(value as number);
          break;
        default:
          displayValue = value;
          break;
      }

      showUndoNotification({
        message: `Successfully updated ${name} of ${ids.length} transaction${ids.length > 1 ? 's' : ''} to [${displayValue}](#${displayValue}).`,
        messageActions: {
          [String(displayValue)]: () => {
            switch (name) {
              case 'account':
                navigate(`/accounts/${value}`);
                break;
              case 'category':
                navigate(`/categories/${value}`);
                break;
              case 'payee':
                navigate(`/payees`);
                break;
              default:
                break;
            }
          },
        },
      });
    };

    const pushPayeeAutocompleteModal = () => {
      dispatch(
        pushModal('payee-autocomplete', {
          onSelect: payeeId => onChange(name, payeeId),
        }),
      );
    };

    const pushAccountAutocompleteModal = () => {
      dispatch(
        pushModal('account-autocomplete', {
          onSelect: accountId => onChange(name, accountId),
        }),
      );
    };

    const pushEditField = () => {
      if (name !== 'date' && name !== 'amount' && name !== 'notes') {
        return;
      }

      dispatch(
        pushModal('edit-field', {
          name,
          onSubmit: (name, value, mode) => onChange(name, value, mode),
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
        pushModal('category-autocomplete', {
          month: transactionsHaveSameMonth ? transactionMonth : undefined,
          onSelect: categoryId => onChange(name, categoryId),
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
          pushModal('confirm-transaction-edit', {
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

  const onBatchDuplicate = async (ids: Array<TransactionEntity['id']>) => {
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

      showUndoNotification({
        message: `Successfully duplicated ${ids.length} transaction${ids.length > 1 ? 's' : ''}.`,
      });
    };

    await checkForReconciledTransactions(
      ids,
      'batchDuplicateWithReconciled',
      onConfirmDuplicate,
    );
  };

  const onBatchDelete = async (ids: Array<TransactionEntity['id']>) => {
    const onConfirmDelete = (ids: Array<TransactionEntity['id']>) => {
      dispatch(
        pushModal('confirm-transaction-delete', {
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
            let transactions = ungroupTransactions(data as TransactionEntity[]);

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
              if (!idSet.has(trans.id) || (parentId && idSet.has(parentId))) {
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
            showUndoNotification({
              type: 'warning',

              message: `Successfully deleted ${ids.length} transaction${ids.length > 1 ? 's' : ''}.`,
            });
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

  const onLinkSchedule = async (ids: Array<TransactionEntity['id']>) => {
    const { data: transactions } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    dispatch(
      pushModal('schedule-link', {
        transactionIds: ids,
        getTransaction: (id: TransactionEntity['id']) =>
          transactions.find((t: TransactionEntity) => t.id === id),
        onScheduleLinked: schedule => {
          // TODO: When schedule becomes available in mobile, update undo notification message
          // with `messageActions` to open the schedule when the schedule name is clicked.
          showUndoNotification({
            message: `Successfully linked ${ids.length} transaction${ids.length > 1 ? 's' : ''} to ${schedule.name}.`,
          });
        },
      }),
    );
  };

  const onUnlinkSchedule = async (ids: Array<TransactionEntity['id']>) => {
    const changes = {
      updated: ids.map(
        id => ({ id, schedule: null }) as unknown as Partial<TransactionEntity>,
      ),
    };
    await send('transactions-batch-update', changes);
    showUndoNotification({
      message: `Successfully unlinked ${ids.length} transaction${ids.length > 1 ? 's' : ''} from their respective schedules.`,
    });
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
        pushModal('confirm-transaction-edit', {
          onConfirm: () => {
            onConfirm(ids);
          },
          confirmReason,
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
    onLinkSchedule,
    onUnlinkSchedule,
  };
}
