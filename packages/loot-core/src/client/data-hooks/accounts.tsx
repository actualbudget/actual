// @ts-strict-ignore
import React, { createContext, useContext } from 'react';

import { q } from '../../shared/query';
import { type AccountEntity } from '../../types/models';
import { useLiveQuery } from '../query-hooks';
import { getAccountsById } from '../reducers/queries';

function useAccounts(): AccountEntity[] {
  return useLiveQuery(() => q('accounts').select('*'), []);
}

const AccountsContext = createContext<AccountEntity[]>(null);

export function AccountsProvider({ children }) {
  const data = useAccounts();
  return (
    <AccountsContext.Provider value={data}>{children}</AccountsContext.Provider>
  );
}

export function CachedAccounts({ children, idKey }) {
  const data = useCachedAccounts({ idKey });
  return children(data);
}

export function useCachedAccounts(): AccountEntity[];
export function useCachedAccounts({
  idKey,
}: {
  idKey: boolean;
}): Record<AccountEntity['id'], AccountEntity>;
export function useCachedAccounts({ idKey }: { idKey?: boolean } = {}) {
  const data = useContext(AccountsContext);
  return idKey && data ? getAccountsById(data) : data;
}
