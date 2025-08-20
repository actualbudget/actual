import React, { useCallback, useEffect, useState } from 'react';

import { listen } from 'loot-core/platform/client/fetch';
import { isPreviewId } from 'loot-core/shared/transactions';
import { type TransactionEntity } from 'loot-core/types/models';

import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import { uncategorizedTransactions } from '@desktop-client/queries';
import { useDispatch } from '@desktop-client/redux';
import * as bindings from '@desktop-client/spreadsheet/bindings';

export function UncategorizedTransactions() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const baseTransactionsQuery = useCallback(
    () => uncategorizedTransactions().options({ splits: 'inline' }).select('*'),
    [],
  );

  const [transactionsQuery, setTransactionsQuery] = useState(
    baseTransactionsQuery(),
  );
  const {
    transactions,
    isLoading,
    isLoadingMore,
    loadMore: loadMoreTransactions,
    reload: reloadTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

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

  const { search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      // details of how the native app used to handle preview transactions here can be found at commit 05e58279
      if (!isPreviewId(transaction.id)) {
        navigate(`/transactions/${transaction.id}`);
      }
    },
    [navigate],
  );

  const balance = bindings.uncategorizedBalance();

  return (
    <SchedulesProvider>
      <TransactionListWithBalances
        isLoading={isLoading}
        transactions={transactions}
        balance={balance}
        searchPlaceholder="Search uncategorized transactions"
        onSearch={onSearch}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMoreTransactions}
        onOpenTransaction={onOpenTransaction}
      />
    </SchedulesProvider>
  );
}
