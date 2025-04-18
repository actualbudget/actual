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

import { syncAndDownload } from 'loot-core/client/app/appSlice';
import {
  accountSchedulesQuery,
  SchedulesProvider,
} from 'loot-core/client/data-hooks/schedules';
import {
  useTransactions,
  useTransactionsSearch,
} from 'loot-core/client/data-hooks/transactions';
import {
  collapseModals,
  openAccountCloseModal,
  pushModal,
} from 'loot-core/client/modals/modalsSlice';
import * as queries from 'loot-core/client/queries';
import {
  markAccountRead,
  reopenAccount,
  updateAccount,
} from 'loot-core/client/queries/queriesSlice';
import { listen, send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccountPreviewTransactions } from '../../../hooks/useAccountPreviewTransactions';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { useFailedAccounts } from '../../../hooks/useFailedAccounts';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSelector, useDispatch } from '../../../redux';
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
  readonly accountId?:
    | AccountEntity['id']
    | 'onbudget'
    | 'offbudget'
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
    | 'uncategorized';
  readonly accountName: AccountEntity['name'] | string;
}) {
  const { t } = useTranslation();
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
        .select([{ balance: { $sumOver: '$amount' } }]),
    [accountId],
  );

  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );
  const {
    transactions,
    isLoading,
    reload: reloadTransactions,
    isLoadingMore,
    loadMore: loadMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const [balancesQuery] = useState<Query>(runningBalancesQuery());
  const {
    transactions: balanceTransactions,
    isLoading: isLoadingBalances,
    isLoadingMore: isLoadingMoreBalances,
    reload: reloadBalances,
    loadMore: loadMoreBalances,
  } = useTransactions({
    query: balancesQuery,
  });

  const { previewTransactions } = useAccountPreviewTransactions({
    accountId: account?.id || '',
  });

  const balances = useMemo(() => {
    const map = new Map<TransactionEntity['id'], number>();
    if (!isLoadingBalances && !isLoadingMoreBalances && balanceTransactions) {
      // First add all transaction balances
      balanceTransactions.forEach(t => {
        //@ts-ignore
        map.set(t.id, t.balance);
      });

      // Get the last transaction's balance to continue from
      const lastTransaction = balanceTransactions[0];
      let runningBalance: number = lastTransaction
        ? (lastTransaction as any).balance
        : 0;

      // Add rolling balances for scheduled transactions in reverse order
      [...previewTransactions].reverse().forEach(t => {
        //@ts-ignore
        runningBalance += t.amount;
        map.set(t.id, runningBalance);
      });
    }
    return map;
  }, [
    balanceTransactions,
    isLoadingBalances,
    isLoadingMoreBalances,
    previewTransactions,
  ]);

  // Wait for initial balances before rendering
  const hasInitialBalances = useMemo(() => {
    return (
      !isLoadingBalances &&
      balanceTransactions &&
      balanceTransactions.length > 0
    );
  }, [isLoadingBalances, balanceTransactions]);

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onRefresh = useCallback(() => {
    if (accountId) {
      dispatch(syncAndDownload({ accountId }));
    }
  }, [accountId, dispatch]);

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
          // Also reload balances when transactions change
          reloadBalances();
        }
      }
    });
  }, [dispatch, reloadTransactions, reloadBalances]);

  // Load more balances when transactions load more
  useEffect(() => {
    if (isLoadingMore) {
      loadMoreBalances();
    }
  }, [isLoadingMore, loadMoreBalances]);

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

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

  // Don't render until we have initial balances
  if (!hasInitialBalances) {
    return null;
  }

  return (
    <TransactionListWithBalances
      isLoading={isLoading}
      transactions={transactionsToDisplay}
      balance={balanceQueries.balance}
      balanceCleared={balanceQueries.cleared}
      balanceUncleared={balanceQueries.uncleared}
      runningBalances={balances}
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
        balance: queries.onBudgetAccountBalance(),
      };
    case 'offbudget':
      return {
        balance: queries.offBudgetAccountBalance(),
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
