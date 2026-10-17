import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import type { Query } from '@actual-app/core/shared/query';
import { isPreviewId } from '@actual-app/core/shared/transactions';
import type {
  RuleConditionEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

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
  const location = useLocation();
  // Filter conditions passed by drill-downs (e.g. report activity)
  const filterConditions = location?.state?.filterConditions || [];
  const isFiltered = filterConditions.length > 0;

  const makeRootTransactionsQuery = useCallback(
    () => queries.transactions().options({ splits: 'all' }).select('*'),
    [],
  );

  const [currentQuery, setCurrentQuery] = useState<Query | undefined>(() =>
    isFiltered ? undefined : makeRootTransactionsQuery(),
  );
  const [transactionsQuery, setTransactionsQuery] = useState<Query | undefined>(
    currentQuery,
  );

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const { isSearching, search } = useTransactionsSearch({
    updateQuery: updateFn =>
      setTransactionsQuery(query => (query ? updateFn(query) : query)),
    resetQuery: () => setTransactionsQuery(currentQuery),
    dateFormat,
  });

  const searchTextRef = useRef('');
  const onSearch = useCallback(
    (searchText: string) => {
      searchTextRef.current = searchText;
      search(searchText);
    },
    [search],
  );

  // Keyed on the serialized conditions, not location.state: updating the URL
  // (e.g. the search param) gives location.state a new identity each time.
  const filterConditionsKey = JSON.stringify(filterConditions);

  useEffect(() => {
    let isStale = false;

    const applyFilters = async (conditions: RuleConditionEntity[]) => {
      const { filters: queryFilters } = await send(
        'make-filters-from-conditions',
        { conditions },
      );
      const rootQuery = makeRootTransactionsQuery();
      const query = rootQuery.filter({ $and: queryFilters });
      if (!isStale) {
        setCurrentQuery(query);
        setTransactionsQuery(query);
        // A search typed or restored before the filters loaded had no query
        // to apply to; re-run it on top of the filtered query.
        if (searchTextRef.current !== '') {
          search(searchTextRef.current);
        }
      }
    };

    const conditions: RuleConditionEntity[] = JSON.parse(filterConditionsKey);
    if (conditions.length) {
      void applyFilters(conditions);
    }

    return () => {
      isStale = true;
    };
  }, [filterConditionsKey, makeRootTransactionsQuery, search]);

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

  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  const transactionsToDisplay =
    !isSearching && !isFiltered
      ? // Do not render child transactions in the list, unless searching or filtering
        previewTransactions.concat(transactions.filter(t => !t.is_child))
      : transactions;

  return (
    <TransactionListWithBalances
      isLoading={
        isSearching || isFiltered
          ? isTransactionsLoading
          : isPreviewTransactionsLoading
      }
      transactions={transactionsToDisplay}
      balance={balanceBindings.balance}
      isLoadingMore={isLoadingMoreTransactions}
      onLoadMore={fetchMoreTransactions}
      searchPlaceholder={t('Search All Accounts')}
      onSearch={onSearch}
      onOpenTransaction={onOpenTransaction}
      showMakeTransfer
      filtered={isFiltered}
    />
  );
}
