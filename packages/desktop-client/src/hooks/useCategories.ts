import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import { type QueriesState } from 'loot-core/client/state-types/queries';

import { useActions } from './useActions';

export function useCategories() {
  const { getCategories } = useActions();

  const categories = useSelector<State, QueriesState['categories']['list']>(
    state => state.queries.categories.list,
  );

  useEffect(() => {
    if (categories.length === 0) {
      getCategories();
    }
  }, []);

  return useSelector<State, QueriesState['categories']>(
    state => state.queries.categories,
  );
}
