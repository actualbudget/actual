import { useEffect } from 'react';

import {
  getCommonPayees,
  getPayees,
} from 'loot-core/client/queries/queriesSlice';

import { useSelector, useDispatch } from '../redux';

import { useInitialMount } from './useInitialMount';

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
