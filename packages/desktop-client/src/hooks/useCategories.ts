import { useEffect } from 'react';

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

  return useSelector(state => state.queries.categories);
}
