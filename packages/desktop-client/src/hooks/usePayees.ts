import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getPayees } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';

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
