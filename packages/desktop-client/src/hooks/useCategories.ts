import { useQuery } from '@tanstack/react-query';

import { groupById } from 'loot-core/shared/util';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { categoryQueries } from '@desktop-client/budget';

const defaultCategories = { grouped: [], list: [] };

export function useCategories() {
  const result = useQuery(categoryQueries.list());
  return { ...result, data: result.data ?? defaultCategories };
}

const defaultCategoriesById: {
  list: Record<string, CategoryEntity>;
  grouped: Record<string, CategoryGroupEntity>;
} = { list: {}, grouped: {} };

export function useCategoriesById() {
  const result = useQuery({
    ...categoryQueries.list(),
    select: data => {
      return {
        list: groupById(data.list),
        grouped: groupById(data.grouped),
      };
    },
  });
  return { ...result, data: result.data ?? defaultCategoriesById };
}
