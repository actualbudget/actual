import { useEffect } from 'react';

import { useInitialMount } from './useInitialMount';

import { getAccounts } from '@desktop-client/accounts/accountsSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

export function useAccounts() {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isAccountsDirty = useSelector(state => state.account.isAccountsDirty);

  useEffect(() => {
    if (isInitialMount || isAccountsDirty) {
      dispatch(getAccounts());
    }
  }, [dispatch, isInitialMount, isAccountsDirty]);

  return useSelector(state => state.account.accounts);
}
