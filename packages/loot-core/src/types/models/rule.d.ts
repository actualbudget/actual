export interface RuleEntity {
  id: string;
  stage: string;
  conditions_op: string;
  conditionsOp?: string; // TODO: this should not be here.. figure out howto remove it
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
