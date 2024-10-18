import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type State } from '../state';
import { getCommonPayees, getPayees } from '../state/actions';

export function useCommonPayees() {
  const dispatch = useDispatch();
  const commonPayeesLoaded = useSelector(
    (state: State) => state.queries.commonPayeesLoaded,
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
  const payeesLoaded = useSelector(
    (state: State) => state.queries.payeesLoaded,
  );

  useEffect(() => {
    if (!payeesLoaded) {
      dispatch(getPayees());
    }
  }, []);

  return useSelector(state => state.queries.payees);
}
