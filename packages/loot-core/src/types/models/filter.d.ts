export interface FilterEntity {
  id?: string;
  name?: string;
  conditions: unknown;
  tombstone: boolean;
}
