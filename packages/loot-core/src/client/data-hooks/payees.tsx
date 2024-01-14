// @ts-strict-ignore
import React, { createContext, useContext } from 'react';

import { q } from '../../shared/query';
import { type PayeeEntity } from '../../types/models';
import { useLiveQuery } from '../query-hooks';
import { getPayeesById } from '../reducers/queries';

function usePayees(): PayeeEntity[] {
  return useLiveQuery(() => q('payees').select('*'), []);
}

const PayeesContext = createContext<PayeeEntity[]>(null);

export function PayeesProvider({ children }) {
  const data = usePayees();
  return (
    <PayeesContext.Provider value={data}>{children}</PayeesContext.Provider>
  );
}

export function CachedPayees({ children, idKey }) {
  const data = useCachedPayees({ idKey });
  return children(data);
}

export function useCachedPayees(): PayeeEntity[];
export function useCachedPayees({
  idKey,
}: {
  idKey: boolean;
}): Record<PayeeEntity['id'], PayeeEntity>;
export function useCachedPayees({ idKey }: { idKey?: boolean } = {}) {
  const data = useContext(PayeesContext);
  return idKey && data ? getPayeesById(data) : data;
}
