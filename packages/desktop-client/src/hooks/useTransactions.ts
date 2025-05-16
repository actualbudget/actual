import { useState, useRef, useEffect, useCallback } from 'react';

import type { Query } from 'loot-core/shared/query';
import type { TransactionEntity } from 'loot-core/types/models';

import {
  type PagedQuery,
  pagedQuery,
} from '@desktop-client/queries/pagedQuery';

type UseTransactionsProps = {
  /**
   * The Query class is immutable so it is important to memoize the query object
   * to prevent unnecessary re-renders i.e. `useMemo`, `useState`, etc.
   */
  query?: Query;
  options?: {
    pageCount?: number;
  };
};
type UseTransactionsResult = {
  transactions: ReadonlyArray<TransactionEntity>;
  isLoading: boolean;
  error?: Error;
  reload: () => void;
  loadMore: () => void;
  isLoadingMore: boolean;
};

export function useTransactions({
  query,
  options = { pageCount: 50 },
}: UseTransactionsProps): UseTransactionsResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [transactions, setTransactions] = useState<
    ReadonlyArray<TransactionEntity>
  >([]);

  const pagedQueryRef = useRef<PagedQuery<TransactionEntity> | null>(null);

  // We don't want to re-render if options changes.
  // Putting options in a ref will prevent that and
  // allow us to use the latest options on next render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let isUnmounted = false;

    setError(undefined);

    if (!query) {
      return;
    }

    function onError(error: Error) {
      if (!isUnmounted) {
        setError(error);
        setIsLoading(false);
      }
    }

    if (query.state.table !== 'transactions') {
      onError(new Error('Query must be a transactions query.'));
      return;
    }

    setIsLoading(true);

    pagedQueryRef.current = pagedQuery<TransactionEntity>(query, {
      onData: data => {
        if (!isUnmounted) {
          setTransactions(data);
          setIsLoading(false);
        }
      },
      onError,
      options: optionsRef.current.pageCount
        ? { pageCount: optionsRef.current.pageCount }
        : {},
    });

    return () => {
      isUnmounted = true;
      pagedQueryRef.current?.unsubscribe();
    };
  }, [query]);

  const loadMore = useCallback(async () => {
    if (!pagedQueryRef.current) {
      return;
    }

    setIsLoadingMore(true);

    await pagedQueryRef.current
      .fetchNext()
      .catch(setError)
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, []);

  const reload = useCallback(() => {
    pagedQueryRef.current?.run();
  }, []);

  return {
    transactions,
    isLoading,
    ...(error && { error }),
    reload,
    loadMore,
    isLoadingMore,
  };
}
