import { type RuleConditionEntity } from './rule';

export interface TransactionFilterEntity {
  id: string;
  name: string;
  conditionsOp: RuleConditionEntity['conditionsOp'];
  conditions: RuleConditionEntity[];
  tombstone: boolean;
}
