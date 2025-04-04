import { CategoryEntity } from './category';
import { CategoryGroupEntity } from './category-group';

export interface CategoryViews {
  grouped: CategoryGroupEntity[];
  list: CategoryEntity[];
}
