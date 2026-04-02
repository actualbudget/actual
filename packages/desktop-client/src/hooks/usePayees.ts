import { useQuery } from '@tanstack/react-query';

import type { PayeeEntity } from 'loot-core/types/models';

import { getPayeesById, payeeQueries } from '@desktop-client/payees';

const emptyPayees: PayeeEntity[] = [];
const emptyPayeesById: Record<string, PayeeEntity> = {};

export function usePayees() {
  const result = useQuery(payeeQueries.list());
  return { ...result, data: result.data ?? emptyPayees };
}

export function usePayeesById() {
  const result = useQuery({
    ...payeeQueries.list(),
    select: payees => getPayeesById(payees),
  });
  return { ...result, data: result.data ?? emptyPayeesById };
}
