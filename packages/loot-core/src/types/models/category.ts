import { CategoryGroupEntity } from './category-group';

export interface CategoryEntity {
  id: string;
  name: string;
  is_income?: boolean;
  group: CategoryGroupEntity['id'];
  goal_def?: string;
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
}
