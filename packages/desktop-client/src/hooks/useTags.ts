import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getTags } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';

export function useTags() {
    const dispatch = useDispatch();
    const tagsLoaded = useSelector(
      (state: State) => state.queries.tagsLoaded,
    );
    const tags = useSelector((state: State) => state.queries.tags);
  
    useEffect(() => {
      if (!tagsLoaded) {
        dispatch(getTags());
      }
    }, [tagsLoaded, tags]);
  
    return tags;
  }
