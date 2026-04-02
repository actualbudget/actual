import { useQuery } from '@tanstack/react-query';

import { getPayeesById, payeeQueries } from '@desktop-client/payees';

export function usePayees() {
  return useQuery(payeeQueries.list());
}

export function usePayeesById() {
  return useQuery({
    ...payeeQueries.list(),
    select: payees => getPayeesById(payees),
  });
}
