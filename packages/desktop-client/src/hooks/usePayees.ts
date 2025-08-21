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
  const isCommonPayeesDirty = useSelector(
    state => state.queries.isCommonPayeesDirty,
  );

  useEffect(() => {
    if (isInitialMount || isCommonPayeesDirty) {
      dispatch(getCommonPayees());
    }
  }, [dispatch, isInitialMount, isCommonPayeesDirty]);

  return useSelector(state => state.queries.commonPayees);
}

export function usePayees() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isPayeesDirty = useSelector(state => state.queries.isPayeesDirty);

  useEffect(() => {
    if (isInitialMount || isPayeesDirty) {
      dispatch(getPayees());
    }
  }, [dispatch, isInitialMount, isPayeesDirty]);

  return useSelector(state => state.queries.payees);
}
