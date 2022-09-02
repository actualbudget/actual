import React, { useEffect, useState, useContext } from 'react';

import q, { liveQuery } from 'loot-core/src/client/query-helpers';
import { getAccountsById } from 'loot-core/src/client/reducers/queries';

export function useAccounts() {
  let [data, setData] = useState(null);

  useEffect(() => {
    let query = liveQuery(q('accounts').select('*'), async accounts => {
      if (query) {
        setData(accounts);
      }
    });

    return () => {
      query.unsubscribe();
      query = null;
    };
  }, []);

  return data;
}

let AccountsContext = React.createContext(null);

export function AccountsProvider({ children }) {
  let data = useAccounts();
  return <AccountsContext.Provider value={data} children={children} />;
}

export function CachedAccounts({ children, idKey }) {
  let data = useCachedAccounts({ idKey });
  return children(data);
}

export function useCachedAccounts({ idKey } = {}) {
  let data = useContext(AccountsContext);
  return idKey && data ? getAccountsById(data) : data;
}
