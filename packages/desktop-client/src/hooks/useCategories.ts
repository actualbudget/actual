import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getCategories } from 'loot-core/client/actions';

export function useCategories() {
  const dispatch = useDispatch();
  const categories = useSelector(state => state.queries.categories.list);

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(getCategories());
    }
  }, []);

  return useSelector<State, QueriesState['categories']>(
    state => state.queries.categories,
  );
}
