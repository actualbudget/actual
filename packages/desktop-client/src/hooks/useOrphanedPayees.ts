import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '#payees/queries';

export function useOrphanedPayees() {
  return useQuery(payeeQueries.listOrphaned());
}
