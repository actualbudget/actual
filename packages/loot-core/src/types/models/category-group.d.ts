import { CategoryEntity } from './category';
import { WithRequired } from 'loot-core/types/util';

export interface NewCategoryGroupEntity {
  name: string;
  is_income?: boolean;
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
  parent_id?: string;
  categories?: Omit<CategoryEntity, 'id'>[];
}

export interface CategoryGroupEntity extends NewCategoryGroupEntity {
  id: string;
  categories?: CategoryEntity[];
  children?: WithRequired<CategoryGroupEntity, 'parent_id'>[];
}
