import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listen, send } from 'loot-core/platform/client/fetch';
import { type Query } from 'loot-core/shared/query';
import { isPreviewId } from 'loot-core/shared/transactions';
import {
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useOffBudgetAccounts } from '@desktop-client/hooks/useOffBudgetAccounts';
import { usePreviewTransactions } from '@desktop-client/hooks/usePreviewTransactions';
import { getSchedulesQuery } from '@desktop-client/hooks/useSchedules';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import { collapseModals, pushModal } from '@desktop-client/modals/modalsSlice';
import * as queries from '@desktop-client/queries';
import { useDispatch } from '@desktop-client/redux';
import * as bindings from '@desktop-client/spreadsheet/bindings';

export function OffBudgetAccountTransactions() {
  const schedulesQuery = useMemo(() => getSchedulesQuery('offbudget'), []);

  return (
    <SchedulesProvider query={schedulesQuery}>
      <TransactionListWithPreviews />
    </SchedulesProvider>
  );
}

function TransactionListWithPreviews() {
  const { t } = useTranslation();
  const baseTransactionsQuery = useCallback(
    () =>
      queries.transactions('offbudget').options({ splits: 'all' }).select('*'),
    [],
  );

  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
    baseTransactionsQuery(),
  );
  const {
    transactions,
    isLoading: isTransactionsLoading,
    reload: reloadTransactions,
    isLoadingMore,
    loadMore: loadMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });
  const offBudgetAccounts = useOffBudgetAccounts();
  const offBudgetAccountsFilter = useCallback(
    (schedule: ScheduleEntity) =>
      offBudgetAccounts.some(a => a.id === schedule._account),
    [offBudgetAccounts],
  );

  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    usePreviewTransactions({
      filter: offBudgetAccountsFilter,
    });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

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
  }, [reloadTransactions]);

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

  const balanceBindings = useMemo(
    () => ({
      balance: bindings.offBudgetAccountBalance(),
    }),
    [],
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
      balance={balanceBindings.balance}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreTransactions}
      searchPlaceholder={t('Search Off Budget Accounts')}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      showMakeTransfer={true}
    />
  );
}
