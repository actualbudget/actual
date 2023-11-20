import {
  AccountEntity,
  PayeeEntity,
  ScheduleEntity,
} from '../../../types/models';

export interface SchedulesHandlers {
  'schedule/create': (arg: {
    schedule: {
      id?: string;
      name?: string;
      post_transaction?: boolean;
    };
    conditions: unknown[];
  }) => Promise<string>;

  'schedule/update': (schedule: {
    schedule;
    conditions?;
    resetNextDate?: boolean;
  }) => Promise<void>;

  'schedule/delete': (arg: { id: string }) => Promise<void>;

  'schedule/skip-next-date': (arg: { id: string }) => Promise<void>;

  'schedule/post-transaction': (arg: { id: string }) => Promise<void>;

  'schedule/force-run-service': () => Promise<unknown>;

  'schedule/discover': () => Promise<{
    id: ScheduleEntity['id'];
    account: AccountEntity['id'];
    payee: PayeeEntity['id'];
    date: ScheduleEntity['_date'];
    amount: ScheduleEntity['_amount'];
    _conditions: [
      { op: 'is'; field: 'account'; value: AccountEntity['id'] },
      { op: 'is'; field: 'payee'; value: PayeeEntity['id'] },
      {
        op: 'is' | 'isapprox';
        field: 'date';
        value: ScheduleEntity['_date'];
      },
      {
        op: 'is' | 'isapprox';
        field: 'amount';
        value: ScheduleEntity['_amount'];
      },
    ];
  }>;

  'schedule/get-upcoming-dates': (arg: {
    config;
    count: number;
  }) => Promise<string[]>;
}
