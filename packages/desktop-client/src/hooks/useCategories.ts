import { useCategoriesQuery } from './useCategoriesQuery';

export function useCategories() {
  const query = useCategoriesQuery();
  // TODO: Update to return query states (e.g. isFetching, isError, etc)
  // so clients can handle loading and error states appropriately.
  return query.data ?? { list: [], grouped: [] };
}
