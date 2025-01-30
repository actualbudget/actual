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

  const initialMount = useInitialMount();

  useEffect(() => {
    if (initialMount && !commonPayeesLoaded) {
      dispatch(getCommonPayees());
    }
  }, [commonPayeesLoaded, dispatch, initialMount]);

  return useSelector(state => state.queries.commonPayees);
}

export function usePayees() {
  const dispatch = useDispatch();
  const payeesLoaded = useSelector(state => state.queries.payeesLoaded);

  const initialMount = useInitialMount();

  useEffect(() => {
    if (initialMount && !payeesLoaded) {
      dispatch(getPayees());
    }
  }, [dispatch, initialMount, payeesLoaded]);

  return useSelector(state => state.queries.payees);
}
