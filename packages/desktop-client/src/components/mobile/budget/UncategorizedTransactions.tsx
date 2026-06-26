import React, { useCallback, useState } from 'react';

import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { TransactionListWithBalances } from '#components/mobile/transactions/TransactionListWithBalances';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useDateFormat } from '#hooks/useDateFormat';
import { useNavigate } from '#hooks/useNavigate';
import { useTransactions } from '#hooks/useTransactions';
import { useTransactionsSearch } from '#hooks/useTransactionsSearch';
import { uncategorizedTransactions } from '#queries';
import * as bindings from '#spreadsheet/bindings';

export function UncategorizedTransactions() {
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
    isPending: isTransactionsLoading,
    isFetchingNextPage: isLoadingMoreTransactions,
    fetchNextPage: fetchMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
  });

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const { search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

  const onOpenTransaction = useCallback(
    (transaction: TransactionEntity) => {
      // details of how the native app used to handle preview transactions here can be found at commit 05e58279
      if (!isPreviewId(transaction.id)) {
        void navigate(`/transactions/${transaction.id}`);
      }
    },
    [navigate],
  );

  const balance = bindings.uncategorizedBalance();

  return (
    <SchedulesProvider>
      <TransactionListWithBalances
        isLoading={isTransactionsLoading}
        transactions={transactions}
        balance={balance}
        searchPlaceholder="Search uncategorized transactions"
        onSearch={onSearch}
        isLoadingMore={isLoadingMoreTransactions}
        onLoadMore={fetchMoreTransactions}
        onOpenTransaction={onOpenTransaction}
        showMakeTransfer
      />
    </SchedulesProvider>
  );
}
