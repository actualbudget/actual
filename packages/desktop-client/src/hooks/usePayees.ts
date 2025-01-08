import { useEffect } from 'react';

import { getCommonPayees, getPayees } from 'loot-core/src/client/actions';

import { useSelector, useDispatch } from '../redux';

export function useCommonPayees() {
  const dispatch = useDispatch();
  const commonPayeesLoaded = useSelector(
    state => state.queries.commonPayeesLoaded,
  );

  useEffect(() => {
    if (!commonPayeesLoaded) {
      dispatch(getCommonPayees());
    }
  }, []);

  return useSelector(state => state.queries.commonPayees);
}

export function usePayees() {
  const dispatch = useDispatch();
  const payeesLoaded = useSelector(state => state.queries.payeesLoaded);

  useEffect(() => {
    if (!payeesLoaded) {
      dispatch(getPayees());
    }
  }, []);

  return useSelector(state => state.queries.payees);
}
