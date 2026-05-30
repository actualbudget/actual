import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { useSyncAndDownloadMutation } from '#accounts';
import { markAccountRead } from '#accounts/accountsSlice';
import { TransactionListWithBalances } from '#components/mobile/transactions/TransactionListWithBalances';
import { useAccountPreviewTransactions } from '#hooks/useAccountPreviewTransactions';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useDateFormat } from '#hooks/useDateFormat';
import { useNavigate } from '#hooks/useNavigate';
import { getSchedulesQuery } from '#hooks/useSchedules';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import {
  calculateRunningBalancesTopDown,
  useTransactions,
} from '#hooks/useTransactions';
import { useTransactionsSearch } from '#hooks/useTransactionsSearch';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import * as queries from '#queries';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

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

  const [showRunningBalances] = useSyncedPref(`show-balances-${account.id}`);
  const [hideReconciled] = useSyncedPref(`hide-reconciled-${account.id}`);

  const baseTransactionsQuery = useCallback(() => {
    let query = queries
      .transactions(account.id)
      .options({ splits: 'all' })
      .select('*');
    if (hideReconciled === 'true') {
      query = query.filter({ reconciled: { $eq: false } });
    }
    return query;
  }, [account.id, hideReconciled]);
  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );

  useEffect(() => {
    setTransactionsQuery(baseTransactionsQuery());
  }, [baseTransactionsQuery]);

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

  const transactionsToDisplay = !isSearching
    ? // Do not render child transactions in the list, unless searching
      previewTransactions.concat(transactions.filter(t => !t.is_child))
    : transactions;

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
