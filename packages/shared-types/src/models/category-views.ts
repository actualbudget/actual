import type { CategoryEntity } from './category';
import type { CategoryGroupEntity } from './category-group';

export type CategoryViews = {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
};
