import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { listen, send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import { type IntegerAmount } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { syncAndDownload } from '@desktop-client/app/appSlice';
import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { AddTransactionButton } from '@desktop-client/components/mobile/transactions/AddTransactionButton';
import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccountPreviewTransactions } from '@desktop-client/hooks/useAccountPreviewTransactions';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFailedAccounts } from '@desktop-client/hooks/useFailedAccounts';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useTransactions } from '@desktop-client/hooks/usePreviewTransactions';
import { accountSchedulesQuery } from '@desktop-client/hooks/useSchedules';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import {
  collapseModals,
  openAccountCloseModal,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import * as queries from '@desktop-client/queries';
import {
  markAccountRead,
  reopenAccount,
  updateAccount,
} from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';
import * as bindings from '@desktop-client/spreadsheet/bindings';

export function AccountTransactions({
  account,
  accountId,
  accountName,
}: {
  readonly account?: AccountEntity;
  readonly accountId?:
    | AccountEntity['id']
    | 'onbudget'
    | 'offbudget'
    | 'closed'
    | 'uncategorized';
  readonly accountName: string;
}) {
  const schedulesQuery = useMemo(
    () => accountSchedulesQuery(accountId),
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
          rightContent={
            <AddTransactionButton accountId={account ? accountId : undefined} />
          }
        />
      }
      padding={0}
    >
      <SchedulesProvider query={schedulesQuery}>
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
      dispatch(updateAccount({ account }));
    },
    [dispatch],
  );

  const onSaveNotes = useCallback(async (id: string, notes: string) => {
    await send('notes-save', { id, note: notes });
  }, []);

  const onEditNotes = useCallback(
    (id: string) => {
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id: `account-${id}`,
              name: account.name,
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [account.name, dispatch, onSaveNotes],
  );

  const onCloseAccount = useCallback(() => {
    dispatch(openAccountCloseModal({ accountId: account.id }));
  }, [account.id, dispatch]);

  const onReopenAccount = useCallback(() => {
    dispatch(reopenAccount({ id: account.id }));
  }, [account.id, dispatch]);

  const [showBalances, setBalances] = useSyncedPref(
    `show-balances-${account.id}`,
  );
  const onToggleRunningBalance = useCallback(() => {
    const newVal = showBalances === 'true' ? 'false' : 'true';
    setBalances(newVal);
    dispatch(
      collapseModals({
        rootModalName: 'account-menu',
      }),
    );
  }, [showBalances, setBalances, dispatch]);

  const onClick = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'account-menu',
          options: {
            accountId: account.id,
            onSave,
            onEditNotes,
            onCloseAccount,
            onReopenAccount,
            onToggleRunningBalance,
          },
        },
      }),
    );
  }, [
    account.id,
    dispatch,
    onCloseAccount,
    onEditNotes,
    onReopenAccount,
    onSave,
    onToggleRunningBalance,
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
    | 'onbudget'
    | 'offbudget'
    | 'closed'
    | 'uncategorized';
  readonly accountName: AccountEntity['name'] | string;
}) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onRefresh = useCallback(() => {
    if (accountId) {
      dispatch(syncAndDownload({ accountId }));
    }
  }, [accountId, dispatch]);

  const baseTransactionsQuery = useCallback(
    () =>
      queries.transactions(accountId).options({ splits: 'all' }).select('*'),
    [accountId],
  );

  const runningBalancesQuery = useCallback(
    () =>
      queries
        .transactions(accountId)
        .options({ splits: 'none' })
        .select({ balance: { $sumOver: '$amount' } }),
    [accountId],
  );

  const [showBalances] = useSyncedPref(`show-balances-${accountId}`);
  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );
  const [balancesQuery] = useState<Query>(runningBalancesQuery);
  const {
    transactions,
    runningBalances,
    isLoading: isTransactionsLoading,
    reload: reloadTransactions,
    isLoadingMore,
    loadMore: loadMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
    runningBalanceQuery: balancesQuery,
    options: {
      calculateRunningBalances: true,
    },
  });

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const {
    previewTransactions,
    runningBalances: previewRunningBalances,
    isLoading: isPreviewTransactionsLoading,
  } = useAccountPreviewTransactions({
    accountId: account?.id,
  });

  const allBalances = useMemo(
    () =>
      new Map<TransactionEntity['id'], IntegerAmount>([
        ...previewRunningBalances,
        ...runningBalances,
      ]),
    [runningBalances, previewRunningBalances],
  );

  useEffect(() => {
    if (accountId) {
      dispatch(markAccountRead({ id: accountId }));
    }
  }, [accountId, dispatch]);

  useEffect(() => {
    return listen('sync-event', event => {
      if (event.type === 'applied') {
        const tables = event.tables;
        if (
          tables.includes('transactions') ||
          tables.includes('category_mapping') ||
          tables.includes('payee_mapping')
        ) {
          reloadTransactions();
        }
      }
    });
  }, [dispatch, reloadTransactions]);

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      if (!isPreviewId(transaction.id)) {
        navigate(`/transactions/${transaction.id}`);
      } else {
        dispatch(
          pushModal({
            modal: {
              name: 'scheduled-transaction-menu',
              options: {
                transactionId: transaction.id,
                onPost: async transactionId => {
                  const parts = transactionId.split('/');
                  await send('schedule/post-transaction', { id: parts[1] });
                  dispatch(
                    collapseModals({
                      rootModalName: 'scheduled-transaction-menu',
                    }),
                  );
                },
                onSkip: async transactionId => {
                  const parts = transactionId.split('/');
                  await send('schedule/skip-next-date', { id: parts[1] });
                  dispatch(
                    collapseModals({
                      rootModalName: 'scheduled-transaction-menu',
                    }),
                  );
                },
                onComplete: async transactionId => {
                  const parts = transactionId.split('/');
                  await send('schedule/update', {
                    schedule: { id: parts[1], completed: true },
                  });
                  dispatch(
                    collapseModals({
                      rootModalName: 'scheduled-transaction-menu',
                    }),
                  );
                },
              },
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

  const transactionsToDisplay = !isSearching
    ? // Do not render child transactions in the list, unless searching
      previewTransactions.concat(transactions.filter(t => !t.is_child))
    : transactions;

  return (
    <TransactionListWithBalances
      isLoading={
        isSearching ? isTransactionsLoading : isPreviewTransactionsLoading
      }
      transactions={transactionsToDisplay}
      balance={balanceQueries.balance}
      balanceCleared={balanceQueries.cleared}
      balanceUncleared={balanceQueries.uncleared}
      runningBalances={allBalances}
      showBalances={isSearching ? false : showBalances === 'true'}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreTransactions}
      searchPlaceholder={t('Search {{accountName}}', { accountName })}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      onRefresh={onRefresh}
      account={account}
    />
  );
}

function queriesFromAccountId(
  id: string | undefined,
  entity: AccountEntity | undefined,
) {
  switch (id) {
    case 'onbudget':
      return {
        balance: bindings.onBudgetAccountBalance(),
      };
    case 'offbudget':
      return {
        balance: bindings.offBudgetAccountBalance(),
      };
    case 'closed':
      return {
        balance: bindings.closedAccountBalance(),
      };
    case 'uncategorized':
      return {
        balance: bindings.uncategorizedBalance(),
      };
    default:
      return entity
        ? {
            balance: bindings.accountBalance(entity.id),
            cleared: bindings.accountBalanceCleared(entity.id),
            uncleared: bindings.accountBalanceUncleared(entity.id),
          }
        : { balance: bindings.allAccountBalance() };
  }
}
