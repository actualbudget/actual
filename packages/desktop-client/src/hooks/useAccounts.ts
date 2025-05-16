import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getAccounts } from '@desktop-client/queries/queriesSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

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
