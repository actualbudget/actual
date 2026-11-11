import { useEffect, useMemo, useRef, useState } from 'react';

import type { Query } from '@actual-app/core/shared/query';
import { debounce } from 'es-toolkit/compat';

import { useFormat } from '#hooks/useFormat';
import * as queries from '#queries';

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
  const currencySymbol = useFormat().currency.symbol;

  const updateQueryRef = useRef(updateQuery);
  updateQueryRef.current = updateQuery;

  const resetQueryRef = useRef(resetQuery);
  resetQueryRef.current = resetQuery;

  const updateSearchQuery = useMemo(
    () =>
      debounce((searchText: string) => {
        if (searchText === '') {
          resetQueryRef.current?.();
          setIsSearching(false);
        } else if (searchText) {
          resetQueryRef.current?.();
          updateQueryRef.current(previousQuery =>
            queries.transactionsSearch(
              previousQuery,
              searchText,
              dateFormat,
              currencySymbol,
            ),
          );
          setIsSearching(true);
        }
      }, delayMs),
    [currencySymbol, dateFormat, delayMs, resetQueryRef, updateQueryRef],
  );

  useEffect(() => {
    return () => updateSearchQuery.cancel();
  }, [updateSearchQuery]);

  return {
    isSearching,
    search: updateSearchQuery,
  };
}
