import { useCategoriesQuery } from './useCategoriesQuery';

export function useCategories() {
  const query = useCategoriesQuery();
  return query.data;
}
