import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getCategories } from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCategories() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount) {
      dispatch(getCategories());
    }
  }, [dispatch, isInitialMount]);

  return useSelector(state => state.queries.categories);
}
