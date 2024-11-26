import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getAccounts } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';

export function useAccounts() {
  const dispatch = useDispatch();
  const accountsLoaded = useSelector(
    (state: State) => state.queries.accountsLoaded,
  );

  useEffect(() => {
    if (!accountsLoaded) {
      dispatch(getAccounts());
    }
  }, []);

  return useSelector(state => state.queries.accounts);
}
