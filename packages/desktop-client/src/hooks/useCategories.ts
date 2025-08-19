import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getCategories } from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCategories() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isCategoriesDirty = useSelector(
    state => state.queries.isCategoriesDirty,
  );

  useEffect(() => {
    if (isInitialMount || isCategoriesDirty) {
      dispatch(getCategories());
    }
  }, [dispatch, isInitialMount, isCategoriesDirty]);

  return useSelector(state => state.queries.categories);
}
