import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { useDispatch, useSelector } from '@desktop-client/redux';
import { getTags } from '@desktop-client/tags/tagsSlice';

export function useTags() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isTagsDirty = useSelector(state => state.tags.isTagsDirty);

  useEffect(() => {
    if (isInitialMount || isTagsDirty) {
      dispatch(getTags());
    }
  }, [dispatch, isInitialMount, isTagsDirty]);

  return useSelector(state => state.tags.tags);
}
