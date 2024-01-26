import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useActions } from './useActions';

export function useCategories() {
  const { getCategories } = useActions();

  const categories = useSelector(state => state.queries.categories.list);

  useEffect(() => {
    if (categories.length === 0) {
      getCategories();
    }
  }, []);

  return useSelector(state => state.queries.categories);
}
