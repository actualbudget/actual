import React, { createContext, useContext } from 'react';

import { type PayeeEntity } from '../../types/models';
import q from '../query-helpers';
import { useLiveQuery } from '../query-hooks';
import { getPayeesById } from '../reducers/queries';

function usePayees() {
  return useLiveQuery(() => q('payees').select('*'), []);
}

let PayeesContext = createContext(null);

export function PayeesProvider({ children }) {
  const data: PayeeEntity[] = usePayees();
  return <PayeesContext.Provider value={data} children={children} />;
}

export function CachedPayees({ children, idKey }) {
  let data = useCachedPayees({ idKey });
  return children(data);
}

export function useCachedPayees(): PayeeEntity[];
export function useCachedPayees({
  idKey,
}: {
  idKey: boolean;
}): Record<PayeeEntity['id'], PayeeEntity>;
export function useCachedPayees({ idKey }: { idKey?: boolean } = {}) {
  const data: PayeeEntity[] = useContext(PayeesContext);
  return idKey && data ? getPayeesById(data) : data;
}
