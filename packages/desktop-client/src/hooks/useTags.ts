import { useEffect } from 'react';

import { getTags } from 'loot-core/client/queries/queriesSlice';

import { useDispatch, useSelector } from '../redux';

import { useInitialMount } from './useInitialMount';

export function useTags() {
  const dispatch = useDispatch();
  const tagsLoaded = useSelector(state => state.queries.tagsLoaded);

  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !tagsLoaded) {
      dispatch(getTags());
    }
  }, [dispatch, isInitialMount, tagsLoaded]);

  return useSelector(state => state.queries.tags);
}
