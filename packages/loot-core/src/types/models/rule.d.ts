export interface RuleEntity {
  id: string;
  stage: string;
  conditions_op: string;
  conditions: unknown;
  actions: unknown;
  tombstone: boolean;
}
