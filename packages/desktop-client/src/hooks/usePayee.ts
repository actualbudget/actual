import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '@desktop-client/payees';

export function usePayee(id?: string | null) {
  return useQuery({
    ...payeeQueries.list(),
    select: payees => payees.find(p => p.id === id),
    enabled: !!id,
  });
}
