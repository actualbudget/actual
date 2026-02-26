import React, { useCallback, useState } from 'react';

import { isPreviewId } from 'loot-core/shared/transactions';
import type { TransactionEntity } from 'loot-core/types/models';

import { TransactionListWithBalances } from '@desktop-client/components/mobile/transactions/TransactionListWithBalances';
import { SchedulesProvider } from '@desktop-client/hooks/useCachedSchedules';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { useTransactionsSearch } from '@desktop-client/hooks/useTransactionsSearch';
import { uncategorizedTransactions } from '@desktop-client/queries';
import * as bindings from '@desktop-client/spreadsheet/bindings';

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
      />
    </SchedulesProvider>
  );
}
