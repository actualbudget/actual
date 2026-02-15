import type { RuleConditionEntity } from './rule';

export type TransactionFilterEntity = {
  id: string;
  name: string;
  conditionsOp: 'and' | 'or';
  conditions: RuleConditionEntity[];
  tombstone: boolean;
};
