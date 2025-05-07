import { useMemo } from 'react';

import { useCategories } from '@desktop-client/hooks/useCategories';

export function useCategory(id: string) {
  const { list: categories } = useCategories();
  return useMemo(() => categories.find(c => c.id === id), [id, categories]);
}
