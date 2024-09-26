import { useState, useMemo, useEffect, type DependencyList } from 'react';

import { type Query } from '../shared/query';

import { liveQuery, type LiveQuery } from './query-helpers';

/** @deprecated: please use `useQuery`; usage is the same - only the returned value is different (object instead of only the data) */
export function useLiveQuery<Response = unknown>(
  makeQuery: () => Query,
  deps: DependencyList,
): Response | null {
  const { data } = useQuery<Response>(makeQuery, deps);
  return data;
}

export function useQuery<Response = unknown>(
  makeQuery: () => Query,
  deps: DependencyList,
): {
  data: null | Response;
  overrideData: (newData: Response) => void;
  isLoading: boolean;
} {
  const [data, setData] = useState<null | Response>(null);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const query = useMemo(makeQuery, deps);

  useEffect(() => {
    setIsLoading(true);

    let live: null | LiveQuery<Response> = liveQuery<Response>(
      query,
      async data => {
        if (live) {
          setIsLoading(false);
          setData(data);
        }
      },
    );

    return () => {
      setIsLoading(false);
      live?.unsubscribe();
      live = null;
    };
  }, [query]);

  return {
    data,
    overrideData: setData,
    isLoading,
  };
}
