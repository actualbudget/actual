import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getPeople } from '@desktop-client/people/peopleSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function usePeople() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isPeopleDirty = useSelector(state => state.people.isPeopleDirty);

  useEffect(() => {
    if (isInitialMount || isPeopleDirty) {
      dispatch(getPeople());
    }
  }, [dispatch, isInitialMount, isPeopleDirty]);

  return useSelector(state => state.people.people);
}
