import { useEffect } from 'react';

import { getCategories } from 'loot-core/src/client/actions';

import { useAppSelector, useAppDispatch } from '../redux';

export function useCategories() {
  const dispatch = useAppDispatch();
  const categoriesLoaded = useAppSelector(state => state.queries.categoriesLoaded);

  useEffect(() => {
    if (!categoriesLoaded) {
      dispatch(getCategories());
    }
  }, []);

  return useAppSelector(state => state.queries.categories);
}
