import { useQuery } from '@tanstack/react-query';

import { payeeQueries } from '#payees';

export function useNearbyPayees({ enabled }: { enabled: boolean }) {
  return useQuery({
    ...payeeQueries.listNearby(),
    enabled,
  });
}
