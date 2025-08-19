import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import {
  getCommonPayees,
  getPayees,
} from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCommonPayees() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount) {
      dispatch(getCommonPayees());
    }
  }, [dispatch, isInitialMount]);

  return useSelector(state => state.queries.commonPayees);
}

export function usePayees() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount) {
      dispatch(getPayees());
    }
  }, [dispatch, isInitialMount]);

  return useSelector(state => state.queries.payees);
}
