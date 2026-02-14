import { useQuery } from '@tanstack/react-query';

import { groupById } from 'loot-core/shared/util';

import { categoryQueries } from '@desktop-client/budget';

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
