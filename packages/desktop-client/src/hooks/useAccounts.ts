import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getAccounts } from 'loot-core/client/actions';

export function useAccounts() {
  const dispatch = useDispatch();
  const accountLoaded = useSelector(state => state.queries.accountsLoaded);

  useEffect(() => {
    if (!accountLoaded) {
      dispatch(getAccounts());
    }
  }, []);

  return useSelector(state => state.queries.accounts);
}
