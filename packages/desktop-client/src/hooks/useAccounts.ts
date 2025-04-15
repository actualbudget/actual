import { useEffect } from 'react';

import { getAccounts } from '../queries/queriesSlice';
import { useSelector, useDispatch } from '../redux';

import { useInitialMount } from './useInitialMount';

export function useAccounts() {
  const dispatch = useDispatch();
  const accountsLoaded = useSelector(state => state.queries.accountsLoaded);
  const isInitialMount = useInitialMount();

  useEffect(() => {
    if (isInitialMount && !accountsLoaded) {
      dispatch(getAccounts());
    }
  }, [accountsLoaded, dispatch, isInitialMount]);

  return useSelector(state => state.queries.accounts);
}
