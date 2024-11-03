import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getCategories } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';

export function useCategories() {
  const dispatch = useDispatch();
  const categoriesLoaded = useSelector(
    (state: State) => state.queries.categoriesLoaded,
  );

  useEffect(() => {
    if (!categoriesLoaded) {
      dispatch(getCategories());
    }
  }, []);

  const selector = useSelector(state => state.queries.categories);
  return useMemo(
    () => ({
      ...selector,
      groupedHierarchy: selector.grouped.filter(g => g.parent_id === null),
    }),
    [selector],
  );
}
