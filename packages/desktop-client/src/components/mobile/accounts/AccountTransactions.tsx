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
  collapseModals,
  getPayees,
  markAccountRead,
  openAccountCloseModal,
  pushModal,
  reopenAccount,
  syncAndDownload,
  updateAccount,
} from 'loot-core/client/actions';
import {
  SchedulesProvider,
  useDefaultSchedulesQueryTransform,
} from 'loot-core/client/data-hooks/schedules';
import * as queries from 'loot-core/client/queries';
import { pagedQuery, runQuery } from 'loot-core/client/query-helpers';
import { listen, send } from 'loot-core/platform/client/fetch';
import {
  isPreviewId,
  realizeTempTransactions,
  ungroupTransactions,
  updateTransaction,
} from 'loot-core/shared/transactions';

import { useDateFormat } from '../../../hooks/useDateFormat';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePreviewTransactions } from '../../../hooks/usePreviewTransactions';
import { styles, theme } from '../../../style';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { MobileBackButton } from '../MobileBackButton';
import { AddTransactionButton } from '../transactions/AddTransactionButton';
import { TransactionListWithBalances } from '../transactions/TransactionListWithBalances';
import { q, Query } from 'loot-core/shared/query';
import { currentDay } from 'loot-core/shared/months';
import { t } from 'i18next';
import { AccountEntity, TransactionEntity } from 'loot-core/types/models';
import { applyChanges } from 'loot-core/shared/util';
import { useSheetValue } from '../../spreadsheet/useSheetValue';

type AccountTransactionsProps = {
  account: AccountEntity;
  pending: number;
  failed: number;
};

export function AccountTransactions({
  account,
  pending,
  failed,
}: AccountTransactionsProps) {
  const [reconcileAmount, setReconcileAmount] = useState<number | null>(null);

  const schedulesTransform = useDefaultSchedulesQueryTransform(account.id);
  return (
    <Page
      header={
        <MobilePageHeader
          title={
            <AccountName
              account={account}
              pending={pending}
              failed={failed}
              onReconcile={v => {
                setReconcileAmount(v);
              }}
            />
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton accountId={account.id} />}
        />
      }
      padding={0}
    >
      <SchedulesProvider transform={schedulesTransform}>
        <TransactionListWithPreviews
          account={account}
          reconcileAmount={reconcileAmount}
          onDoneReconciling={async () => {
            const { data } = await runQuery(
              q('transactions')
                .filter({
                  cleared: true,
                  reconciled: false,
                  account: account.id,
                })
                .select('*')
                .options({ splits: 'grouped' }),
            );
            let transactions = ungroupTransactions(data);

            const changes: { updated: Array<Partial<TransactionEntity>> } = {
              updated: [],
            };

            transactions.forEach(trans => {
              const { diff } = updateTransaction(transactions, {
                ...trans,
                reconciled: true,
              });

              transactions = applyChanges(diff, transactions);

              changes.updated = changes.updated
                ? changes.updated.concat(diff.updated)
                : diff.updated;
            });

            await send('transactions-batch-update', changes);
            setReconcileAmount(null);
          }}
        />
      </SchedulesProvider>
    </Page>
  );
}

function AccountName({ account, pending, failed, onReconcile }) {
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

  const clearedAmount = useSheetValue(
    queries.accountBalanceCleared(account) as any,
  );

  const onReconcileAccount = () => {
    dispatch(
      pushModal('reconcile', {
        accountId: account.id,
        clearedBalance: clearedAmount,
        onReconcile,
      }),
    );
  };

  const onClick = () => {
    dispatch(
      pushModal('account-menu', {
        accountId: account.id,
        onSave,
        onEditNotes,
        onCloseAccount,
        onReopenAccount,
        onReconcileAccount,
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
        style={{
          userSelect: 'none',
          ...styles.underlinedText,
          ...styles.lineClamp(2),
        }}
        onClick={onClick}
      >
        {`${account.closed ? 'Closed: ' : ''}${account.name}`}
      </Text>
    </View>
  );
}

type TransactionListWithPreviewsProps = {
  account: AccountEntity;
  reconcileAmount: number | null;
  onDoneReconciling: () => void;
};

function TransactionListWithPreviews({
  account,
  reconcileAmount,
  onDoneReconciling,
}: TransactionListWithPreviewsProps) {
  const [currentQuery, setCurrentQuery] = useState<Query>();
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const prependTransactions = usePreviewTransactions(() => {});
  const allTransactions = useMemo(
    () =>
      !isSearching ? prependTransactions.concat(transactions) : transactions,
    [isSearching, prependTransactions, transactions],
  );

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
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

  return (
    <TransactionListWithBalances
      isLoading={isLoading}
      transactions={allTransactions}
      balance={balance}
      balanceCleared={balanceCleared}
      balanceUncleared={balanceUncleared}
      onLoadMore={onLoadMore}
      searchPlaceholder={`Search ${account.name}`}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      onRefresh={onRefresh}
      reconcileAmount={reconcileAmount}
      onDoneReconciling={onDoneReconciling}
      onCreateReconciliationTransaction={async diff => {
        const reconciliationTransactions = realizeTempTransactions([
          {
            id: 'temp',
            account: account.id,
            cleared: true,
            reconciled: false,
            amount: diff,
            date: currentDay(),
            notes: t('Reconciliation balance adjustment'),
          },
        ]);

        setTransactions([...reconciliationTransactions, ...transactions]);

        // sync the reconciliation transaction
        await send('transactions-batch-update', {
          added: reconciliationTransactions,
        });
      }}
    />
  );
}
