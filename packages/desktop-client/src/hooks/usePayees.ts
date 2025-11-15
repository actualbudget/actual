import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import {
  getCommonPayees,
  getNearbyPayees,
  getPayees,
  getPayeesById,
} from '@desktop-client/payees/payeesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';
import { locationService } from 'loot-core/shared/location';

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

export function useNearbyPayees() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isNearbyPayeesDirty = useSelector(
    state => state.payees.isNearbyPayeesDirty,
  );

  useEffect(() => {
    const fetchNearbyPayees = async () => {
      try {
        const location = await locationService.getCurrentPosition();
        dispatch(
          getNearbyPayees({
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        );
      } catch (error) {
        console.warn('Could not get location for nearby payees:', error);
      }
    };

    if (isInitialMount || isNearbyPayeesDirty) {
      fetchNearbyPayees();
    }
  }, [dispatch, isInitialMount, isNearbyPayeesDirty]);

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
