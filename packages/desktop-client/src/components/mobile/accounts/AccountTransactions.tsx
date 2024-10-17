import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
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
  defaultSchedulesQueryBuilder,
  SchedulesProvider,
} from 'loot-core/client/data-hooks/schedules';
import {
  usePreviewTransactions,
  useTransactions,
} from 'loot-core/client/data-hooks/transactions';
import * as queries from 'loot-core/client/queries';
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
  const schedulesQueryBuilder = useMemo(
    () => defaultSchedulesQueryBuilder(accountId),
    [accountId],
  );

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
      <SchedulesProvider queryBuilder={schedulesQueryBuilder}>
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

  const onSave = useCallback(
    (account: AccountEntity) => {
      dispatch(updateAccount(account));
    },
    [dispatch],
  );

  const onSaveNotes = useCallback(async (id: string, notes: string) => {
    await send('notes-save', { id, note: notes });
  }, []);

  const onEditNotes = useCallback(
    (id: string) => {
      dispatch(
        pushModal('notes', {
          id: `account-${id}`,
          name: account.name,
          onSave: onSaveNotes,
        }),
      );
    },
    [account.name, dispatch, onSaveNotes],
  );

  const onCloseAccount = useCallback(() => {
    dispatch(openAccountCloseModal(account.id));
  }, [account.id, dispatch]);

  const onReopenAccount = useCallback(() => {
    dispatch(reopenAccount(account.id));
  }, [account.id, dispatch]);

  const onClick = useCallback(() => {
    dispatch(
      pushModal('account-menu', {
        accountId: account.id,
        onSave,
        onEditNotes,
        onCloseAccount,
        onReopenAccount,
      }),
    );
  }, [
    account.id,
    dispatch,
    onCloseAccount,
    onEditNotes,
    onReopenAccount,
    onSave,
  ]);

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
  readonly accountId?:
    | AccountEntity['id']
    | 'budgeted'
    | 'offbudget'
    | 'uncategorized';
  readonly accountName: AccountEntity['name'] | string;
}) {
  const baseTransactionsQuery = useCallback(
    () =>
      queries.transactions(accountId).options({ splits: 'none' }).select('*'),
    [accountId],
  );

  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );
  const [isSearching, setIsSearching] = useState(false);
  const {
    transactions,
    isLoading,
    reload: reloadTransactions,
    loadMore: loadMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const { data: previewTransactions, isLoading: isPreviewTransactionsLoading } =
    usePreviewTransactions({ options: { isDisabled: isSearching } });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onRefresh = useCallback(() => {
    dispatch(syncAndDownload(accountId));
  }, [accountId, dispatch]);

  useEffect(() => {
    if (accountId) {
      dispatch(markAccountRead(accountId));
    }
  }, [accountId, dispatch]);

  useEffect(() => {
    return listen('sync-event', ({ type, tables }) => {
      if (type === 'applied') {
        if (
          tables.includes('transactions') ||
          tables.includes('category_mapping') ||
          tables.includes('payee_mapping')
        ) {
          reloadTransactions?.();
        }

        if (tables.includes('payees') || tables.includes('payee_mapping')) {
          dispatch(getPayees());
        }
      }
    });
  }, [dispatch, reloadTransactions]);

  const updateSearchQuery = useDebounceCallback(
    useCallback(
      searchText => {
        if (searchText === '') {
          setTransactionsQuery(baseTransactionsQuery());
        } else if (searchText) {
          setTransactionsQuery(currentQuery =>
            queries.transactionsSearch(currentQuery, searchText, dateFormat),
          );
        }

        setIsSearching(searchText !== '');
      },
      [setTransactionsQuery, baseTransactionsQuery, dateFormat],
    ),
    150,
  );

  const onSearch = useCallback(
    (text: string) => {
      updateSearchQuery(text);
    },
    [updateSearchQuery],
  );

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
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
    },
    [dispatch, navigate],
  );

  const balanceQueries = useMemo(
    () => queriesFromAccountId(accountId, account),
    [accountId, account],
  );

  return (
    <TransactionListWithBalances
      isLoading={isLoading || isPreviewTransactionsLoading}
      transactions={previewTransactions.concat(transactions)}
      balance={balanceQueries.balance}
      balanceCleared={balanceQueries.cleared}
      balanceUncleared={balanceQueries.uncleared}
      onLoadMore={loadMoreTransactions}
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
