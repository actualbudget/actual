import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getTags } from '@desktop-client/queries/queriesSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function useTags() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount) {
      dispatch(getTags());
    }
  }, [dispatch, isInitialMount]);

  return useSelector(state => state.queries.tags);
}
