import type { CategoryEntity } from './category';

export type CategoryGroupEntity = {
  id: string;
  name: string;
  is_income?: boolean;
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
  categories?: CategoryEntity[];
};
