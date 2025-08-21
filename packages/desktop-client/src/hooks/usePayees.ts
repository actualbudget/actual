import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getCommonPayees, getPayees } from '@desktop-client/payees/payeesSlice';
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
