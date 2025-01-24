import { CategoryGroupEntity } from './category-group';

export interface CategoryEntity {
  id: string;
  name: string;
  is_income?: boolean | 1 | 0;
  cat_group?: CategoryGroupEntity['id'];
  sort_order?: number;
  tombstone?: boolean | 1 | 0;
  hidden?: boolean | 1 | 0;
  goal_def?: string;
}
