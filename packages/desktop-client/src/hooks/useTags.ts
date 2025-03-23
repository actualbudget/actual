import { useEffect, useMemo } from 'react';

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

// for use with Autocomplete, needs id and name in return type
export function useTagOptions(): { id: string; name: string }[] {
  const tags = useTags();
  return useMemo(
    () => tags?.map(t => ({ id: t ?? '', name: t ?? '' })) || [],
    [tags],
  );
}
