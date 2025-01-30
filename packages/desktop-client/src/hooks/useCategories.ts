import { useEffect } from 'react';

import { getCategories } from 'loot-core/client/queries/queriesSlice';

import { useSelector, useDispatch } from '../redux';

import { useInitialMount } from './useInitialMount';

export function useCategories() {
  const dispatch = useDispatch();
  const categoriesLoaded = useSelector(state => state.queries.categoriesLoaded);
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !categoriesLoaded) {
      dispatch(getCategories());
    }
  }, [categoriesLoaded, dispatch, isInitialMount]);

  return useSelector(state => state.queries.categories);
}
