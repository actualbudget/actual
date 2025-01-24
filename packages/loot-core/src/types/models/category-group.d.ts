import { CategoryEntity } from './category';

export interface NewCategoryGroupEntity {
  name: string;
  is_income?: boolean | 1 | 0;
  sort_order?: number;
  tombstone?: boolean | 1 | 0;
  hidden?: boolean | 1 | 0;
  categories?: Omit<CategoryEntity, 'id'>[];
}

export interface CategoryGroupEntity extends NewCategoryGroupEntity {
  id: string;
  categories?: CategoryEntity[];
}
