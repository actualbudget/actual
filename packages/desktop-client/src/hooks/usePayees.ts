import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import {
  getCommonPayees,
  getPayees,
} from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useCommonPayees() {
  const dispatch = useDispatch();
  const commonPayeesLoaded = useSelector(
    state => state.queries.commonPayeesLoaded,
  );

  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !commonPayeesLoaded) {
      dispatch(getCommonPayees());
    }
  }, [commonPayeesLoaded, dispatch, isInitialMount]);

  return useSelector(state => state.queries.commonPayees);
}

export function usePayees() {
  const dispatch = useDispatch();
  const payeesLoaded = useSelector(state => state.queries.payeesLoaded);

  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !payeesLoaded) {
      dispatch(getPayees());
    }
  }, [dispatch, isInitialMount, payeesLoaded]);

  return useSelector(state => state.queries.payees);
}
