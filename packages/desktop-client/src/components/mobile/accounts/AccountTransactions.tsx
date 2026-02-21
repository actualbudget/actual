import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/connection';
import type { Query } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import type { IntegerAmount } from 'loot-core/shared/util';
import type { AccountEntity, TransactionEntity } from 'loot-core/types/models';

import { useSyncAndDownloadMutation } from '@desktop-client/accounts';
import { markAccountRead } from '@desktop-client/accounts/accountsSlice';
import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { useAccountPreviewTransactions } from '@desktop-client/hooks/useAccountPreviewTransactions';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { getSchedulesQuery } from '@desktop-client/hooks/useSchedules';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  calculateRunningBalancesTopDown,
  useTransactions,
} from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import { collapseModals, pushModal } from '@desktop-client/modals/modalsSlice';
import * as queries from '@desktop-client/queries';
import { useDispatch } from '@desktop-client/redux';
import * as bindings from '@desktop-client/spreadsheet/bindings';

export function AccountTransactions({
  account,
}: {
  readonly account: AccountEntity;
}) {
  const schedulesQuery = useMemo(
    () => getSchedulesQuery(account.id),
    [account.id],
  );

  return (
    <SchedulesProvider query={schedulesQuery}>
      <TransactionListWithPreviews account={account} />
    </SchedulesProvider>
  );
}

function TransactionListWithPreviews({
  account,
}: {
  readonly account: AccountEntity;
}) {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const baseTransactionsQuery = useCallback(
    () =>
      queries.transactions(account.id).options({ splits: 'all' }).select('*'),
    [account.id],
  );

  const [showRunningBalances] = useSyncedPref(`show-balances-${account.id}`);
  const [hideReconciled] = useSyncedPref(`hide-reconciled-${account.id}`);
  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const shouldCalculateRunningBalances =
    showRunningBalances === 'true' && !!account?.id && !isSearching;

  const accountBalanceValue = useSheetValue<
    'account',
    'balance' | 'accounts-balance'
  >(
    account?.id
      ? bindings.accountBalance(account?.id)
      : bindings.allAccountBalance(),
  );

  const {
    transactions,
    runningBalances,
    isPending: isTransactionsLoading,
    isFetchingNextPage: isLoadingMoreTransactions,
    fetchNextPage: fetchMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
    options: {
      calculateRunningBalances: shouldCalculateRunningBalances
        ? calculateRunningBalancesTopDown
        : shouldCalculateRunningBalances,
      startingBalance: accountBalanceValue || 0,
    },
  });

  const {
    previewTransactions,
    runningBalances: previewRunningBalances,
    isLoading: isPreviewTransactionsLoading,
  } = useAccountPreviewTransactions({
    accountId: account?.id,
  });

  const syncAndDownload = useSyncAndDownloadMutation();
  const onRefresh = useCallback(() => {
    if (account.id) {
      syncAndDownload.mutate({ id: account.id });
    }
  }, [account.id, syncAndDownload]);

  const allBalances = useMemo(
    () =>
      new Map<TransactionEntity['id'], IntegerAmount>([
        ...previewRunningBalances,
        ...runningBalances,
      ]),
    [runningBalances, previewRunningBalances],
  );

  useEffect(() => {
    if (account.id) {
      dispatch(markAccountRead({ id: account.id }));
    }
  }, [account.id, dispatch]);

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      if (!isPreviewId(transaction.id)) {
        void navigate(`/transactions/${transaction.id}`);
      } else {
        dispatch(
          pushModal({
            modal: {
              name: 'scheduled-transaction-menu',
              options: {
                transactionId: transaction.id,
                onPost: async (transactionId, today = false) => {
                  const parts = transactionId.split('/');
                  await send('schedule/post-transaction', {
                    id: parts[1],
                    today,
                  });
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

  const balanceBindings = useMemo(
    () => ({
      balance: bindings.accountBalance(account.id),
      cleared: bindings.accountBalanceCleared(account.id),
      uncleared: bindings.accountBalanceUncleared(account.id),
    }),
    [account],
  );

  const baseTransactions = !isSearching
    ? // Do not render child transactions in the list, unless searching
      previewTransactions.concat(transactions.filter(t => !t.is_child))
    : transactions;
  const transactionsToDisplay =
    hideReconciled === 'true'
      ? baseTransactions.filter(t => !t.reconciled)
      : baseTransactions;

  return (
    <TransactionListWithBalances
      isLoading={
        isSearching
          ? isTransactionsLoading
          : isTransactionsLoading || isPreviewTransactionsLoading
      }
      transactions={transactionsToDisplay}
      balance={balanceBindings.balance}
      balanceCleared={balanceBindings.cleared}
      balanceUncleared={balanceBindings.uncleared}
      runningBalances={allBalances}
      showRunningBalances={shouldCalculateRunningBalances}
      isLoadingMore={isLoadingMoreTransactions}
      onLoadMore={fetchMoreTransactions}
      searchPlaceholder={t('Search {{accountName}}', {
        accountName: account.name,
      })}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      onRefresh={onRefresh}
    />
  );
}
