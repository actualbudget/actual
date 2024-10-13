import { useState, useRef, useEffect } from 'react';

import { type Query } from '../shared/query';

import { liveQuery, type LiveQuery } from './query-helpers';

export function useQuery<Response = unknown>(
  makeQuery: () => Query,
): {
  data: null | ReadonlyArray<Response>;
  isLoading: boolean;
} {
  const [data, setData] = useState<null | ReadonlyArray<Response>>(null);
  const [isLoading, setIsLoading] = useState(true);

  const makeQueryRef = useRef<() => Query>(makeQuery);
  makeQueryRef.current = makeQuery;

  useEffect(() => {
    setIsLoading(true);

    let live: null | LiveQuery<Response> = liveQuery<Response>(
      makeQueryRef.current(),
      data => {
        if (live) {
          setIsLoading(false);
          setData(data);
        }
      },
    );

    return () => {
      live?.unsubscribe();
      live = null;
    };
  }, []);

  return {
    data,
    isLoading,
  };
}
