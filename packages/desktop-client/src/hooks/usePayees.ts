import { useEffect } from 'react';

import { getCommonPayees, getPayees } from 'loot-core/src/client/actions';

import { useAppSelector, useAppDispatch } from '../redux';

export function useCommonPayees() {
  const dispatch = useAppDispatch();
  const commonPayeesLoaded = useAppSelector(
    state => state.queries.commonPayeesLoaded,
  );

  useEffect(() => {
    if (!commonPayeesLoaded) {
      dispatch(getCommonPayees());
    }
  }, []);

  return useAppSelector(state => state.queries.commonPayees);
}

export function usePayees() {
  const dispatch = useAppDispatch();
  const payeesLoaded = useAppSelector(state => state.queries.payeesLoaded);

  useEffect(() => {
    if (!payeesLoaded) {
      dispatch(getPayees());
    }
  }, []);

  return useAppSelector(state => state.queries.payees);
}
