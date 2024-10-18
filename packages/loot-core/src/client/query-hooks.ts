import { useState, useMemo, useEffect, type DependencyList } from 'react';

import { type Query } from '../shared/query';

import { liveQuery, type LiveQuery } from './query-helpers';

type UseQueryResult<Response> = {
  data: null | ReadonlyArray<Response>;
  isLoading: boolean;
  isError: boolean;
};

export function useQuery<Response = unknown>(
  makeQuery: () => Query | null,
  dependencies: DependencyList,
): UseQueryResult<Response> {
  const [data, setData] = useState<null | ReadonlyArray<Response>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Memo the resulting query. We don't care if the function
  // that creates the query changes, only the resulting query.
  // Safe to ignore the eslint warning here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const query = useMemo(makeQuery, dependencies);

  useEffect(() => {
    if (!query) {
      setIsError(true);
      return;
    }

    setIsLoading(true);

    let live: null | LiveQuery<Response> = liveQuery<Response>(query, data => {
      if (live) {
        setIsLoading(false);
        setData(data);
      }
    });

    return () => {
      live?.unsubscribe();
      live = null;
    };
  }, [query]);

  return {
    data,
    isLoading,
    isError,
  };
}
