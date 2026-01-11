import { useEffect } from 'react';

import { locationService } from 'loot-core/shared/location';

import { useInitialMount } from './useInitialMount';

import {
  getCommonPayees,
  getNearbyPayees,
  getPayees,
  getPayeesById,
} from '@desktop-client/payees/payeesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCommonPayees() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isCommonPayeesDirty = useSelector(
    state => state.payees.isCommonPayeesDirty,
  );

  useEffect(() => {
    if (isInitialMount || isCommonPayeesDirty) {
      dispatch(getCommonPayees());
    }
  }, [dispatch, isInitialMount, isCommonPayeesDirty]);

  return useSelector(state => state.payees.commonPayees);
}

export function useNearbyPayees(locationAccess: boolean = false) {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isNearbyPayeesDirty = useSelector(
    state => state.payees.isNearbyPayeesDirty,
  );

  useEffect(() => {
    let isCancelled = false;
    const fetchNearbyPayees = async () => {
      // Skip fetching nearby payees if we shouldn't be accessing location
      if (!locationAccess) {
        return;
      }

      try {
        const location = await locationService.getCurrentPosition();
        if (isCancelled) {
          return;
        }

        dispatch(
          getNearbyPayees({
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        );
      } catch (error) {
        console.warn('Could not get location for nearby payees', { error });
      }
    };

    if ((isInitialMount || isNearbyPayeesDirty) && locationAccess) {
      fetchNearbyPayees();
    }

    return () => {
      isCancelled = true;
    };
  }, [dispatch, isInitialMount, isNearbyPayeesDirty, locationAccess]);

  return useSelector(state => state.payees.nearbyPayees);
}

export function usePayees() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isPayeesDirty = useSelector(state => state.payees.isPayeesDirty);

  useEffect(() => {
    if (isInitialMount || isPayeesDirty) {
      dispatch(getPayees());
    }
  }, [dispatch, isInitialMount, isPayeesDirty]);

  return useSelector(state => state.payees.payees);
}

export function usePayeesById() {
  const payees = usePayees();
  return getPayeesById(payees);
}
