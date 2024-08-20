import { CategoryGroupEntity } from './category-group';

export interface CategoryEntity {
  id: string;
  name: string;
  is_income?: boolean;
  cat_group?: CategoryGroupEntity['id'];
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
}
