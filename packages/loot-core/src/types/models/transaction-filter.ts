import type { TransactionGroupBy } from '#shared/transaction-groups';

import type { RuleConditionEntity } from './rule';

export type TransactionFilterEntity = {
  id: string;
  name: string;
  conditionsOp: 'and' | 'or';
  conditions: RuleConditionEntity[];
  groupBy?: TransactionGroupBy;
  tombstone: boolean;
};
