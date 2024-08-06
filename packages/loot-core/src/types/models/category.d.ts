export interface CategoryEntity {
  id: string;
  name: string;
  is_income?: boolean;
  cat_group?: string;
  sort_order?: number;
  tombstone?: boolean;
  hidden?: boolean;
}
