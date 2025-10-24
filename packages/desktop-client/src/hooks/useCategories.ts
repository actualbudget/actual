import { useCategoriesQuery } from './useCategoriesQuery';

export function useCategories() {
  const query = useCategoriesQuery();
  // We know data is always defined because of placeholderData
  return query.data!;
}
