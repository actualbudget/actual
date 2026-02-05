import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '@desktop-client/payees/queries';

export function useOrphanedPayees() {
  return useQuery(payeeQueries.listOrphaned());
}
