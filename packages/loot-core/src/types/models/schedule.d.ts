import type { AccountEntity } from './account';
import type { PayeeEntity } from './payee';
import type { RuleEntity } from './rule';

export interface RecurPattern {
  value: number;
  type: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'day';
}

export interface RecurConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  patterns?: RecurPattern[];
  skipWeekend?: boolean;
  start: string;
  endMode: 'never' | 'after_n_occurrences' | 'on_date';
  endOccurrences?: number;
  endDate?: string;
  weekendSolveMode?: 'before' | 'after';
}

export interface ScheduleEntity {
  id: string;
  name?: string;
  rule: RuleEntity['id'];
  next_date: string;
  completed: boolean;
  posts_transaction: boolean;
  tombstone: boolean;

  // These are special fields that are actually pulled from the
  // underlying rule
  _payee: PayeeEntity['id'];
  _account: AccountEntity['id'];
  _amount: number | { num1: number; num2: number };
  _amountOp: string;
  _date: RecurConfig;
  _conditions: unknown;
  _actions: unknown;
}

export type DiscoverScheduleEntity = {
  id: ScheduleEntity['id'];
  account: AccountEntity['id'];
  payee: PayeeEntity['id'];
  date: ScheduleEntity['_date'];
  amount: ScheduleEntity['_amount'];
  _conditions: Array<
    | { op: 'is'; field: 'account'; value: AccountEntity['id'] }
    | { op: 'is'; field: 'payee'; value: PayeeEntity['id'] }
    | {
        op: 'is' | 'isapprox';
        field: 'date';
        value: ScheduleEntity['_date'];
      }
    | {
        op: 'is' | 'isapprox';
        field: 'amount';
        value: ScheduleEntity['_amount'];
      }
  >;
};
