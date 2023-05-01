export interface CategoryGroupEntity {
  id?: string;
  name: string;
  is_income?: boolean;
  sort_order?: number;
  tombstone?: boolean;
  // TODO: remove once properly typed
  [k: string]: unknown;
}
