import { useEffect, useMemo } from 'react';

import { useInitialMount } from './useInitialMount';

import { getCategories } from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCategories() {
  const dispatch = useDispatch();
  const categoriesLoaded = useSelector(state => state.queries.categoriesLoaded);
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !categoriesLoaded) {
      dispatch(getCategories());
    }
  }, [categoriesLoaded, dispatch, isInitialMount]);

  const selector = useSelector(state => state.queries.categories);
  return useMemo(
    () => ({
      ...selector,
          groupedHierarchy: selector.grouped.filter(g => g.parent_id == null),
    }),
    [selector],
  );
}
