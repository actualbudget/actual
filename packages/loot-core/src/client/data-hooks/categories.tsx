import React, { createContext, useContext } from 'react';

import q from '../query-helpers';
import { useLiveQuery } from '../query-hooks';
import { getCategoriesById } from '../reducers/queries';

export function useCategories() {
  return useLiveQuery(() => q('categories').select('*'), []);
}

let CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  let data = useCategories();
  return <CategoriesContext.Provider value={data} children={children} />;
}

export function CachedCategories({ children, idKey }) {
  let data = useCachedCategories({ idKey });
  return children(data);
}

export function useCachedCategories({ idKey }: { idKey? } = {}) {
  let data = useContext(CategoriesContext);
  return idKey && data ? getCategoriesById(data) : data;
}
