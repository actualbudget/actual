import { useEffect, useMemo } from 'react';

import { useInitialMount } from './useInitialMount';

import { getCategories } from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCategories(options?: { hierarchical?: boolean }) {
  const dispatch = useDispatch();
  const categoriesLoaded = useSelector(state => state.queries.categoriesLoaded);
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !categoriesLoaded) {
      dispatch(getCategories({ hierarchical: options?.hierarchical ?? false }));
    }
  }, [categoriesLoaded, dispatch, isInitialMount, options?.hierarchical]); //Confirm if options?.hierarchical is needed

  const selector = useSelector(state => state.queries.categories);
  return useMemo(
    () => ({
      ...selector,
      groupedHierarchy: selector.grouped,
    }),
    [selector],
  );
}
