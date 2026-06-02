import { CategoryEntity } from './category';

export interface CategoryGroupEntity {
  id: string;
  name: string;
  is_income?: boolean;
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
  categories?: CategoryEntity[];
}
