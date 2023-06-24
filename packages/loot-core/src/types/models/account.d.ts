export interface AccountEntity {
  id?: string;
  name: string;
  offbudget?: boolean;
  closed?: boolean;
  sort_order?: number;
  tombstone?: boolean;
  // TODO: remove once properly typed
  [k: string]: unknown;
}
