import React, { useEffect, useState, useContext } from 'react';

import q, { liveQuery } from 'loot-core/src/client/query-helpers';
import { getPayeesById } from 'loot-core/src/client/reducers/queries';

export function usePayees() {
  let [data, setData] = useState([]);

  useEffect(() => {
    let query = liveQuery(q('payees').select('*'), async payees => {
      if (query) {
        setData(payees);
      }
    });

    return () => {
      query.unsubscribe();
      query = null;
    };
  }, []);

  return data;
}

let PayeesContext = React.createContext(null);

export function PayeesProvider({ children }) {
  let data = usePayees();
  return <PayeesContext.Provider value={data} children={children} />;
}

export function CachedPayees({ children, idKey }) {
  let data = useCachedPayees({ idKey });
  return children(data);
}

export function useCachedPayees({ idKey } = {}) {
  let data = useContext(PayeesContext);
  return idKey && data ? getPayeesById(data) : data;
}
