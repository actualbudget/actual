import { useState, useMemo, useEffect, type DependencyList } from 'react';

import { type Query } from 'loot-core/shared/query';

import { liveQuery, type LiveQuery } from '@desktop-client/queries/liveQuery';

type UseQueryResult<Response> = {
  data: null | ReadonlyArray<Response>;
  isLoading: boolean;
  error?: Error;
};

export function useQuery<Response = unknown>(
  makeQuery: () => Query | null,
  dependencies: DependencyList,
): UseQueryResult<Response> {
  // Memo the resulting query. We don't care if the function
  // that creates the query changes, only the resulting query.
  // Safe to ignore the eslint warning here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const query = useMemo(makeQuery, dependencies);

  const [data, setData] = useState<ReadonlyArray<Response> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    setError(query === null ? new Error('Query is null') : undefined);
    setIsLoading(!!query);

    if (!query) {
      return;
    }

    let isUnmounted = false;
    let live: null | LiveQuery<Response> = liveQuery<Response>(query, {
      onData: data => {
        if (!isUnmounted) {
          setData(data);
          setIsLoading(false);
        }
      },
      onError: setError,
    });

    return () => {
      isUnmounted = true;
      live?.unsubscribe();
      live = null;
    };
  }, [query]);

  return {
    data,
    isLoading,
    ...(error && { error }),
  };
}
