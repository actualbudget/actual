import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
import { type PagedQuery, pagedQuery } from 'loot-core/client/query-helpers';
import { listen, send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useDateFormat } from '../../../hooks/useDateFormat';
import { useFailedAccounts } from '../../../hooks/useFailedAccounts';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePreviewTransactions } from '../../../hooks/usePreviewTransactions';
import { styles, theme } from '../../../style';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { MobileBackButton } from '../MobileBackButton';
import { AddTransactionButton } from '../transactions/AddTransactionButton';
import { TransactionListWithBalances } from '../transactions/TransactionListWithBalances';

export function AccountTransactions({
  account,
  accountId,
  accountName,
}: {
  readonly account?: AccountEntity;
  readonly accountId?: string;
  readonly accountName: string;
}) {
  const schedulesTransform = useDefaultSchedulesQueryTransform(accountId);
  return (
    <Page
      header={
        <MobilePageHeader
          title={
            account ? (
              <AccountHeader account={account} />
            ) : (
              <NameOnlyHeader accountName={accountName} />
            )
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton accountId={accountId} />}
        />
      }
      padding={0}
    >
      <SchedulesProvider transform={schedulesTransform}>
        <TransactionListWithPreviews
          account={account}
          accountName={accountName}
          accountId={accountId}
        />
      </SchedulesProvider>
    </Page>
  );
}

function AccountHeader({ account }: { readonly account: AccountEntity }) {
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const pending = useMemo(
    () => syncingAccountIds.includes(account.id),
    [syncingAccountIds, account.id],
  );
  const failed = useMemo(
    () => failedAccounts.has(account.id),
    [failedAccounts, account.id],
  );

  const dispatch = useDispatch();

  const onSave = (account: AccountEntity) => {
    dispatch(updateAccount(account));
  };

  const onSaveNotes = async (id: string, notes: string) => {
    await send('notes-save', { id, note: notes });
  };

  const onEditNotes = (id: string) => {
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
      {account.bank && (
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
      <Button variant="bare" onPress={onClick}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: 500,
            ...styles.underlinedText,
            ...(styles.lineClamp(2) as CSSProperties),
          }}
        >
          {`${account.closed ? 'Closed: ' : ''}${account.name}`}
        </Text>
      </Button>
    </View>
  );
}

function NameOnlyHeader({ accountName }: { readonly accountName: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      <Text style={{ ...(styles.lineClamp(2) as CSSProperties) }}>
        {accountName}
      </Text>
    </View>
  );
}

function TransactionListWithPreviews({
  account,
  accountId,
  accountName,
}: {
  readonly account?: AccountEntity;
  readonly accountId?: string;
  readonly accountName: string;
}) {
  const [currentQuery, setCurrentQuery] = useState<Query>();
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<
    ReadonlyArray<TransactionEntity>
  >([]);
  const prependTransactions = usePreviewTransactions({
    accountId: account?.id,
  });
  const allTransactions = useMemo(
    () =>
      !isSearching ? prependTransactions.concat(transactions) : transactions,
    [isSearching, prependTransactions, transactions],
  );

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onRefresh = () => {
    dispatch(syncAndDownload(accountId));
  };

  const makeRootQuery = useCallback(
    () => queries.makeTransactionsQuery(accountId).options({ splits: 'none' }),
    [accountId],
  );

  const paged = useRef<PagedQuery>();

  const updateQuery = useCallback((query: Query) => {
    paged.current?.unsubscribe();
    setIsLoading(true);
    paged.current = pagedQuery(
      query.options({ splits: 'none' }).select('*'),
      (data: ReadonlyArray<TransactionEntity>) => {
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
    dispatch(markAccountRead(accountId));
    return () => unlisten();
  }, [accountId, dispatch, fetchTransactions]);

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

  const onSearch = (text: string) => {
    updateSearchQuery(text);
  };

  const onOpenTransaction = (transaction: TransactionEntity) => {
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

  const balanceQueries = useMemo(
    () => queriesFromAccountId(accountId, account),
    [accountId, account],
  );

  return (
    <TransactionListWithBalances
      isLoading={isLoading}
      transactions={allTransactions}
      balance={balanceQueries.balance}
      balanceCleared={balanceQueries.cleared}
      balanceUncleared={balanceQueries.uncleared}
      onLoadMore={onLoadMore}
      searchPlaceholder={`Search ${accountName}`}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      onRefresh={onRefresh}
    />
  );
}

function queriesFromAccountId(
  id: string | undefined,
  entity: AccountEntity | undefined,
) {
  switch (id) {
    case 'budgeted':
      return {
        balance: queries.budgetedAccountBalance(),
      };
    case 'offbudget':
      return {
        balance: queries.offbudgetAccountBalance(),
      };
    case 'uncategorized':
      return {
        balance: queries.uncategorizedBalance(),
      };
    default:
      return entity
        ? {
            balance: queries.accountBalance(entity),
            cleared: queries.accountBalanceCleared(entity),
            uncleared: queries.accountBalanceUncleared(entity),
          }
        : { balance: queries.allAccountBalance() };
  }
}
