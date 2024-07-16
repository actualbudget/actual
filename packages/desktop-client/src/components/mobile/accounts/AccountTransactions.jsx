import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';

import { useDebounceCallback } from 'usehooks-ts';

import {
  addNotification,
  collapseModals,
  getPayees,
  markAccountRead,
  openAccountCloseModal,
  pushModal,
  reopenAccount,
  syncAndDownload,
  undo,
  updateAccount,
} from 'loot-core/client/actions';
import {
  SchedulesProvider,
  useCachedSchedules,
  useDefaultSchedulesQueryTransform,
} from 'loot-core/client/data-hooks/schedules';
import * as queries from 'loot-core/client/queries';
import { pagedQuery, runQuery } from 'loot-core/client/query-helpers';
import { listen, send } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  deleteTransaction,
  isPreviewId,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
  updateTransaction,
} from 'loot-core/shared/transactions';
import { applyChanges, integerToCurrency } from 'loot-core/shared/util';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePayees } from '../../../hooks/usePayees';
import { usePreviewTransactions } from '../../../hooks/usePreviewTransactions';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { styles, theme } from '../../../style';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { MobileBackButton } from '../MobileBackButton';
import { AddTransactionButton } from '../transactions/AddTransactionButton';
import { TransactionListWithBalances } from '../transactions/TransactionListWithBalances';

export function AccountTransactions({ account, pending, failed }) {
  const schedulesTransform = useDefaultSchedulesQueryTransform(account.id);
  return (
    <Page
      header={
        <MobilePageHeader
          title={
            <AccountName account={account} pending={pending} failed={failed} />
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton accountId={account.id} />}
        />
      }
      padding={0}
    >
      <SchedulesProvider transform={schedulesTransform}>
        <TransactionListWithPreviews account={account} />
      </SchedulesProvider>
    </Page>
  );
}

function AccountName({ account, pending, failed }) {
  const dispatch = useDispatch();

  const onSave = account => {
    dispatch(updateAccount(account));
  };

  const onSaveNotes = async (id, notes) => {
    await send('notes-save', { id, note: notes });
  };

  const onEditNotes = id => {
    dispatch(
      pushModal('notes', {
        id: `account-${id}`,
        name: account.name,
        onSave: onSaveNotes,
      }),
    );
  };

  const onCloseAccount = () => {
    dispatch(openAccountCloseModal(account.id));
  };

  const onReopenAccount = () => {
    dispatch(reopenAccount(account.id));
  };

  const onClick = () => {
    dispatch(
      pushModal('account-menu', {
        accountId: account.id,
        onSave,
        onEditNotes,
        onCloseAccount,
        onReopenAccount,
      }),
    );
  };
  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      {account.bankId && (
        <div
          style={{
            margin: 'auto',
            marginRight: 5,
            width: 8,
            height: 8,
            borderRadius: 8,
            flexShrink: 0,
            backgroundColor: pending
              ? theme.sidebarItemBackgroundPending
              : failed
                ? theme.sidebarItemBackgroundFailed
                : theme.sidebarItemBackgroundPositive,
            transition: 'transform .3s',
          }}
        />
      )}
      <Text
        style={{ ...styles.underlinedText, ...styles.lineClamp(2) }}
        onClick={onClick}
      >
        {`${account.closed ? 'Closed: ' : ''}${account.name}`}
      </Text>
    </View>
  );
}

function TransactionListWithPreviews({ account }) {
  const accounts = useAccounts();
  const payees = usePayees();
  const { list: categories } = useCategories();
  const scheduleData = useCachedSchedules();
  const [currentQuery, setCurrentQuery] = useState();
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const prependTransactions = usePreviewTransactions();
  const allTransactions = useMemo(
    () =>
      !isSearching ? prependTransactions.concat(transactions) : transactions,
    [isSearching, prependTransactions, transactions],
  );

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [_numberFormat] = useSyncedPref('numberFormat');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onRefresh = async () => {
    await dispatch(syncAndDownload(account.id));
  };

  const makeRootQuery = useCallback(
    () => queries.makeTransactionsQuery(account.id).options({ splits: 'none' }),
    [account.id],
  );

  const paged = useRef(null);

  const updateQuery = useCallback(query => {
    paged.current?.unsubscribe();
    setIsLoading(true);
    paged.current = pagedQuery(
      query.options({ splits: 'none' }).select('*'),
      data => {
        setTransactions(data);
        setIsLoading(false);
      },
      { pageCount: 50 },
    );
  }, []);

  const fetchTransactions = useCallback(() => {
    const query = makeRootQuery();
    setCurrentQuery(query);
    updateQuery(query);
  }, [makeRootQuery, updateQuery]);

  const refetchTransactions = () => {
    paged.current?.run();
  };

  useEffect(() => {
    const unlisten = listen('sync-event', ({ type, tables }) => {
      if (type === 'applied') {
        if (
          tables.includes('transactions') ||
          tables.includes('category_mapping') ||
          tables.includes('payee_mapping')
        ) {
          refetchTransactions();
        }

        if (tables.includes('payees') || tables.includes('payee_mapping')) {
          dispatch(getPayees());
        }
      }
    });

    fetchTransactions();
    dispatch(markAccountRead(account.id));
    return () => unlisten();
  }, [account.id, dispatch, fetchTransactions]);

  const updateSearchQuery = useDebounceCallback(
    useCallback(
      searchText => {
        if (searchText === '' && currentQuery) {
          updateQuery(currentQuery);
        } else if (searchText && currentQuery) {
          updateQuery(
            queries.makeTransactionSearchQuery(
              currentQuery,
              searchText,
              dateFormat,
            ),
          );
        }

        setIsSearching(searchText !== '');
      },
      [currentQuery, dateFormat, updateQuery],
    ),
    150,
  );

  const onSearch = text => {
    updateSearchQuery(text);
  };

  const onOpenTransaction = transaction => {
    if (!isPreviewId(transaction.id)) {
      navigate(`/transactions/${transaction.id}`);
    } else {
      dispatch(
        pushModal('scheduled-transaction-menu', {
          transactionId: transaction.id,
          onPost: async transactionId => {
            const parts = transactionId.split('/');
            await send('schedule/post-transaction', { id: parts[1] });
            dispatch(collapseModals('scheduled-transaction-menu'));
          },
          onSkip: async transactionId => {
            const parts = transactionId.split('/');
            await send('schedule/skip-next-date', { id: parts[1] });
            dispatch(collapseModals('scheduled-transaction-menu'));
          },
        }),
      );
    }
  };

  const onLoadMore = () => {
    paged.current?.fetchNext();
  };

  const balance = queries.accountBalance(account);
  const balanceCleared = queries.accountBalanceCleared(account);
  const balanceUncleared = queries.accountBalanceUncleared(account);

  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const hasMoreThanOneSelected = selectedTransactions.length > 1;

  const onAddSelectedTransaction = transactionId =>
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId],
    );

  const onClearSelectedTransactions = () => {
    setSelectedTransactions([]);
  };

  const showUndoNotification = ({
    type = 'message',
    title = 'Batch operation complete',
    message,
    messageActions,
  }) => {
    dispatch(
      addNotification({
        type,
        title,
        message,
        messageActions,
        sticky: true,
        button: {
          title: 'Undo',
          action: async () => {
            await dispatch(undo());
          },
        },
      }),
    );
  };

  const onBatchEdit = async (name, ids) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);

    const onChange = async (name, value, mode) => {
      let transactionsToChange = transactions;

      const newValue = value === null ? '' : value;
      const changes = { deleted: [], updated: [] };

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
        transactionsToChange = applyChanges(diff, transactionsToChange);

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
          displayValue = accounts.find(a => a.id === value).name;
          break;
        case 'category':
          displayValue = categories.find(c => c.id === value).name;
          break;
        case 'payee':
          displayValue = payees.find(p => p.id === value).name;
          break;
        case 'amount':
          displayValue = integerToCurrency(value);
          break;
        default:
          displayValue = value;
          break;
      }

      showUndoNotification({
        message: `Successfully updated ${name} of ${selectedTransactions.length} transaction${hasMoreThanOneSelected ? 's' : ''} to [${displayValue}](#${displayValue}).`,
        messageActions: {
          [displayValue]: () => {
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
      onClearSelectedTransactions();
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
      dispatch(pushModal('edit-field', { name, onSubmit: onChange }));
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

  const onBatchDuplicate = async ids => {
    const onConfirmDuplicate = async ids => {
      const { data } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*')
          .options({ splits: 'grouped' }),
      );

      const changes = {
        added: data
          .reduce((newTransactions, trans) => {
            return newTransactions.concat(
              realizeTempTransactions(ungroupTransaction(trans)),
            );
          }, [])
          .map(({ sort_order, ...trans }) => ({ ...trans })),
      };

      await send('transactions-batch-update', changes);

      showUndoNotification({
        message: `Successfully duplicated ${selectedTransactions.length} transaction${hasMoreThanOneSelected ? 's' : ''}.`,
      });
      onClearSelectedTransactions();
    };

    await checkForReconciledTransactions(
      ids,
      'batchDuplicateWithReconciled',
      onConfirmDuplicate,
    );
  };

  const onBatchDelete = async ids => {
    const onConfirmDelete = ids => {
      dispatch(
        pushModal('confirm-transaction-delete', {
          message: hasMoreThanOneSelected
            ? `Are you sure you want to delete these ${ids.length} transaction${hasMoreThanOneSelected ? 's' : ''}?`
            : undefined,
          onConfirm: async () => {
            const { data } = await runQuery(
              q('transactions')
                .filter({ id: { $oneof: ids } })
                .select('*')
                .options({ splits: 'grouped' }),
            );
            let transactions = ungroupTransactions(data);

            const idSet = new Set(ids);
            const changes = { deleted: [], updated: [] };

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
              transactions = applyChanges(diff, transactions);

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
              message: `Successfully deleted ${selectedTransactions.length} transaction${hasMoreThanOneSelected ? 's' : ''}.`,
            });
            onClearSelectedTransactions();
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

  const onLinkSchedule = ids => {
    dispatch(
      pushModal('schedule-link', {
        transactionIds: ids,
        getTransaction: id => transactions.find(t => t.id === id),
        onScheduleLinked: scheduleId => {
          const scheduleName = scheduleData.schedules.find(
            s => s.id === scheduleId,
          ).name;
          // TODO: When schedule becomes available in mobile, update undo notification message
          // to open the schedule when the schedule name is clicked.
          showUndoNotification({
            message: `Successfully linked ${selectedTransactions.length} transaction${hasMoreThanOneSelected ? 's' : ''} to ${scheduleName}.`,
          });
          onClearSelectedTransactions();
        },
      }),
    );
  };

  const onUnlinkSchedule = async ids => {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null })),
    });
    showUndoNotification({
      message: `Successfully unlinked ${selectedTransactions.length} transaction${hasMoreThanOneSelected ? 's' : ''} from their respective schedules.`,
    });
    onClearSelectedTransactions();
  };

  const onSetTransfer = () => {
    // Add support when All accounts/For budget/Off budget views are added.
  };

  const checkForReconciledTransactions = async (
    ids,
    confirmReason,
    onConfirm,
  ) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids }, reconciled: true })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);
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

  return (
    <TransactionListWithBalances
      isLoading={isLoading}
      transactions={allTransactions}
      selectedTransactions={selectedTransactions}
      onAddSelectedTransaction={onAddSelectedTransaction}
      onClearSelectedTransactions={onClearSelectedTransactions}
      balance={balance}
      balanceCleared={balanceCleared}
      balanceUncleared={balanceUncleared}
      onLoadMore={onLoadMore}
      searchPlaceholder={`Search ${account.name}`}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      onRefresh={onRefresh}
      onBatchEdit={onBatchEdit}
      onBatchDuplicate={onBatchDuplicate}
      onSetTransfer={onSetTransfer}
      onLinkSchedule={onLinkSchedule}
      onUnlinkSchedule={onUnlinkSchedule}
      onBatchDelete={onBatchDelete}
    />
  );
}
