export interface TransactionFilterEntity {
  id: string;
  name: string;
  conditions_op: string;
  conditions: unknown;
  tombstone: boolean;
}
