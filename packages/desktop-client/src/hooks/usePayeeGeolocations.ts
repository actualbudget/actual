import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import {
  getPayeeGeolocations,
} from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function usePayeeGeolocations() {
  const dispatch = useDispatch();
  const payeeGeolocationsLoaded = useSelector(state => state.queries.payeeGeolocationsLoaded);

  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !payeeGeolocationsLoaded) {
      dispatch(getPayeeGeolocations());
    }
  }, [dispatch, isInitialMount, payeeGeolocationsLoaded]);

  return useSelector(state => state.queries.payeeGeolocations);
}
