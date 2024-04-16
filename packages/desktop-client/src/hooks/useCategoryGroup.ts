import { useMemo } from 'react';

import { useCategories } from './useCategories';

export function useCategoryGroup(id: string) {
  const { grouped: categoryGroups } = useCategories();
  return useMemo(
    () => categoryGroups.find(g => g.id === id),
    [id, categoryGroups],
  );
}
