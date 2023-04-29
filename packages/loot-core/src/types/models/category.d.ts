import type { CategoryGroupEntity } from './category-group';

export interface CategoryEntity {
  id?: string;
  name: string;
  is_income?: boolean;
  group: CategoryGroupEntity;
  sort_order?: number;
  tombstone?: boolean;
}
