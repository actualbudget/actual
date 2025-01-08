import { useEffect } from 'react';

import { getAccounts } from 'loot-core/src/client/actions';

import { useAppSelector, useAppDispatch } from '../redux';

export function useAccounts() {
  const dispatch = useAppDispatch();
  const accountsLoaded = useAppSelector(state => state.queries.accountsLoaded);

  useEffect(() => {
    if (!accountsLoaded) {
      dispatch(getAccounts());
    }
  }, []);

  return useAppSelector(state => state.queries.accounts);
}
