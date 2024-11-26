import { type RuleConditionEntity } from './rule';

export interface TransactionFilterEntity {
  id: string;
  name: string;
  conditionsOp: 'and' | 'or';
  conditions: RuleConditionEntity[];
  tombstone: boolean;
}
