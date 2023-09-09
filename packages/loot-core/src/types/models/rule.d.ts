export interface RuleEntity {
  id: string;
  stage: string;
  conditionsOp: 'any' | 'and';
  conditions: RuleConditionEntity[];
  actions: RuleActionEntity[];
  tombstone: boolean;
}

interface RuleConditionEntity {
  field: unknown;
  op: unknown;
  value: unknown;
  options: unknown;
  conditionsOp: unknown;
}

interface RuleActionEntity {
  field: unknown;
  op: unknown;
  value: unknown;
  options: unknown;
}
