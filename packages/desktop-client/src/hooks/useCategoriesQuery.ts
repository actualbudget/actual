import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '@desktop-client/budget';

export function useCategoriesQuery() {
  return useQuery(categoryQueries.list());
}
