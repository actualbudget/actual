import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getPayees } from 'loot-core/client/actions';

export function usePayees() {
  const dispatch = useDispatch();
  const payees = useSelector(state => state.queries.payees);

  useEffect(() => {
    if (payees.length === 0) {
      dispatch(getPayees());
    }
  }, []);

  return useSelector(state => state.queries.payees);
}
