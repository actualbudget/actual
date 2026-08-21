import { createContext } from 'react';

import type { CategoryGroupEntity } from '@actual-app/core/types/models';

export const FilteredCategoriesContext = createContext<
  CategoryGroupEntity[] | null
>(null);
