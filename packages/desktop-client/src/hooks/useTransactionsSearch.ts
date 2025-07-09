import { useState, useMemo, useEffect } from 'react';

import { debounce } from 'lodash';

import type { Query } from 'loot-core/shared/query';

import * as queries from '@desktop-client/queries';

type UseTransactionsSearchProps = {
  updateQuery: (updateFn: (searchQuery: Query) => Query) => void;
  resetQuery: () => void;
  dateFormat: string;
  delayMs?: number;
};
type UseTransactionsSearchResult = {
  isSearching: boolean;
  search: (searchText: string) => void;
};

export function useTransactionsSearch({
  updateQuery,
  resetQuery,
  dateFormat,
  delayMs = 150,
}: UseTransactionsSearchProps): UseTransactionsSearchResult {
  const [isSearching, setIsSearching] = useState(false);

  const updateSearchQuery = useMemo(
    () =>
      debounce((searchText: string) => {
        if (searchText === '') {
          resetQuery();
          setIsSearching(false);
        } else if (searchText) {
          resetQuery();
          updateQuery(previousQuery =>
            queries.transactionsSearch(previousQuery, searchText, dateFormat),
          );
          setIsSearching(true);
        }
      }, delayMs),
    [dateFormat, delayMs, resetQuery, updateQuery],
  );

  useEffect(() => {
    return () => updateSearchQuery.cancel();
  }, [updateSearchQuery]);

  return {
    isSearching,
    search: updateSearchQuery,
  };
}
