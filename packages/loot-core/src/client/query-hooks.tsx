import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  type DependencyList,
} from 'react';

import { type Query } from '../shared/query';

import { liveQuery, LiveQuery } from './query-helpers';

function makeContext(queryState, opts, QueryClass) {
  let query = new QueryClass(queryState, null, opts);
  let Context = createContext(null);

  function Provider({ children }) {
    let [data, setData] = useState(query.getData());
    let value = useMemo(() => ({ data, query }), [data, query]);

    useEffect(() => {
      if (query.getNumListeners() !== 0) {
        throw new Error(
          'Query already has listeners. You cannot use the same query context `Provider` twice',
        );
      }

      let unlisten = query.addListener(data => setData(data));

      // Start the query if it hasn't run yet. Most likely it's not
      // running, however the user can freely start the query early if
      // they want
      if (!query.isRunning()) {
        query.run();
      }

      // There's a small chance data has changed between rendering and
      // running this effect, so just in case set this again. Note
      // this won't rerender if the data is the same
      setData(query.getData());

      return () => {
        unlisten();
        query.unsubscribe();
      };
    }, []);

    return <Context.Provider value={value} children={children} />;
  }

  function useQuery() {
    let queryData = useContext(Context);
    if (queryData == null) {
      throw new Error(
        '`useQuery` tried to access a query that hasn’t been run. You need to put its `Provider` in a parent component',
      );
    }
    return queryData;
  }

  return {
    Provider,
    useQuery,
  };
}

export function liveQueryContext(query, opts) {
  return makeContext(query, opts, LiveQuery);
}

export function useLiveQuery(makeQuery: () => Query, deps: DependencyList) {
  let [data, setData] = useState(null);
  let query = useMemo(makeQuery, deps);

  useEffect(() => {
    let live = liveQuery(query, async data => {
      if (live) {
        setData(data);
      }
    });

    return () => {
      live.unsubscribe();
      live = null;
    };
  }, [query]);

  return data;
}
