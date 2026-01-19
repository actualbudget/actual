import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { listen, send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import { type IntegerAmount } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { markAccountRead } from '@desktop-client/accounts/accountsSlice';
import { syncAndDownload } from '@desktop-client/app/appSlice';
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
  const location = useLocation();

  // Get search text from location state (restored when navigating back)
  const locationState = location.state as { searchText?: string } | null;
  const initialSearchText = locationState?.searchText ?? '';

  // Track current search text for navigation state
  const searchTextRef = useRef(initialSearchText);

  const baseTransactionsQuery = useCallback(
    () =>
      queries.transactions(account.id).options({ splits: 'all' }).select('*'),
    [account.id],
  );

  const [showRunningBalances] = useSyncedPref(`show-balances-${account.id}`);
  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );

  const { isSearching, search: baseOnSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  // Wrap onSearch to track the current search text
  const onSearch = useCallback(
    (text: string) => {
      searchTextRef.current = text;
      baseOnSearch(text);
    },
    [baseOnSearch],
  );

  // Apply initial search text on mount if present
  useEffect(() => {
    if (initialSearchText) {
      baseOnSearch(initialSearchText);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    isLoading: isTransactionsLoading,
    reload: reloadTransactions,
    isLoadingMore,
    loadMore: loadMoreTransactions,
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

  const onRefresh = useCallback(() => {
    if (account.id) {
      dispatch(syncAndDownload({ accountId: account.id }));
    }
  }, [account.id, dispatch]);

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
        // Pass search text in state so it can be restored when navigating back
        navigate(`/transactions/${transaction.id}`, {
          state: { searchText: searchTextRef.current },
        });
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
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreTransactions}
      searchPlaceholder={t('Search {{accountName}}', {
        accountName: account.name,
      })}
      onSearch={onSearch}
      defaultSearchText={initialSearchText}
      onOpenTransaction={onOpenTransaction}
      onRefresh={onRefresh}
    />
  );
}
