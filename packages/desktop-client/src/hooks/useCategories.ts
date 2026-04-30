import { groupById } from '@actual-app/core/shared/util';
import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '#budget';

export function useCategories() {
  return useQuery(categoryQueries.list());
}

export function useCategoriesById() {
  return useQuery({
    ...categoryQueries.list(),
    select: data => {
      return {
        list: groupById(data.list),
        grouped: groupById(data.grouped),
      };
    },
  });
}
