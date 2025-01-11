import { useEffect } from 'react';

import { getCategories } from 'loot-core/client/queries/queriesSlice';

import { useSelector, useDispatch } from '../redux';

export function useCategories() {
  const dispatch = useDispatch();
  const categoriesLoaded = useSelector(state => state.queries.categoriesLoaded);

  useEffect(() => {
    if (!categoriesLoaded) {
      dispatch(getCategories());
    }
  }, []);

  return useSelector(state => state.queries.categories);
}
