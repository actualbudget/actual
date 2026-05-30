import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { TransactionListWithBalances } from '#components/mobile/transactions/TransactionListWithBalances';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useDateFormat } from '#hooks/useDateFormat';
import { useNavigate } from '#hooks/useNavigate';
import { usePreviewTransactions } from '#hooks/usePreviewTransactions';
import { getSchedulesQuery } from '#hooks/useSchedules';
import { useTransactions } from '#hooks/useTransactions';
import { useTransactionsSearch } from '#hooks/useTransactionsSearch';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import * as queries from '#queries';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

export function AllAccountTransactions() {
  const schedulesQuery = useMemo(() => getSchedulesQuery(), []);

  return (
    <SchedulesProvider query={schedulesQuery}>
      <TransactionListWithPreviews />
    </SchedulesProvider>
  );
}

function TransactionListWithPreviews() {
  const { t } = useTranslation();
  const baseTransactionsQuery = useCallback(
    () => queries.transactions().options({ splits: 'all' }).select('*'),
    [],
  );

  const [transactionsQuery, setTransactionsQuery] = useState<Query>(
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
  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    usePreviewTransactions();

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => setTransactionsQuery(baseTransactionsQuery()),
    dateFormat,
  });

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
      balance: bindings.allAccountBalance(),
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
      isLoadingMore={isLoadingMoreTransactions}
      onLoadMore={fetchMoreTransactions}
      searchPlaceholder={t('Search All Accounts')}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      showMakeTransfer
    />
  );
}
