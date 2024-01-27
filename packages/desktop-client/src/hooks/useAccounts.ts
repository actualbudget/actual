import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getAccounts } from 'loot-core/client/actions';

export function useAccounts() {
  const dispatch = useDispatch();
  const accounts = useSelector(state => state.queries.accounts);

  useEffect(() => {
    if (accounts == null || accounts.length === 0) {
      dispatch(getAccounts());
    }
  }, []);

  return useSelector(state => state.queries.accounts);
}
