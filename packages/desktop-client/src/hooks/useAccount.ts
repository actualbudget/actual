import { useQuery } from '@tanstack/react-query';

import { accountQueries } from '@desktop-client/accounts';

export function useAccount(id: string) {
  const query = useQuery({
    ...accountQueries.list(),
    select: data => data.find(c => c.id === id),
  });
  return query.data;
}
