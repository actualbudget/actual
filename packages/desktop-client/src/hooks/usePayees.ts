import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getPayees } from 'loot-core/client/actions';

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
