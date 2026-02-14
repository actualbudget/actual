import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '@desktop-client/budget';

export function useCategory(id?: string | null) {
  return useQuery({
    ...categoryQueries.list(),
    select: data => data.list.find(c => c.id === id),
    enabled: !!id,
  });
}
