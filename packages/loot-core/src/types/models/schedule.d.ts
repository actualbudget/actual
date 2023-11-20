import { SchedulesHandlers } from '../../server/schedules/types/handlers';

import type { AccountEntity } from './account';
import type { PayeeEntity } from './payee';
import type { RuleEntity } from './rule';

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
  _amount: unknown;
  _amountOp: string;
  _date: {
    interval: number;
    patterns: {
      value: number;
      type: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'day';
    }[];
    skipWeekend: boolean;
    start: string;
    weekendSolveMode: 'before' | 'after';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
  _conditions: unknown;
  _actions: unknown;
}

export type DiscoverScheduleEntity = Awaited<
  ReturnType<SchedulesHandlers['schedule/discover']>
>;
