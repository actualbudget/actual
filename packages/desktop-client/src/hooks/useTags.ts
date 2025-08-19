import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getTags } from '@desktop-client/queries/queriesSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function useTags() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isTagsDirty = useSelector(state => state.queries.isTagsDirty);

  useEffect(() => {
    if (isInitialMount || isTagsDirty) {
      dispatch(getTags());
    }
  }, [dispatch, isInitialMount, isTagsDirty]);

  return useSelector(state => state.queries.tags);
}
