import type { AccountEntity } from './account';
import type { PayeeEntity } from './payee';
import type { RuleEntity } from './rule';

export interface ScheduleEntity {
  id?: string;
  name?: string;
  rule: RuleEntity;
  next_date: string;
  completed: boolean;
  posts_transaction: boolean;
  tombstone: boolean;

  // These are special fields that are actually pulled from the
  // underlying rule
  _payee: PayeeEntity;
  _account: AccountEntity;
  _amount: unknown;
  _amountOp: string;
  _date: unknown;
  _conditions: unknown;
  _actions: unknown;
}
