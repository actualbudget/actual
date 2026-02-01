import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '@desktop-client/budget';

export function useCategoryGroup(id: string) {
  const query = useQuery({
    ...categoryQueries.list(),
    select: data => data.grouped.find(g => g.id === id),
  });
  return query.data;
}
