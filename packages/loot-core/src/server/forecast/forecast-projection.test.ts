import { describe, expect, it } from 'vitest';

import type { TransactionEntity } from '#types/models';

import { projectForecastData } from './forecast-projection';
import type { AccountWithComputedBalance } from './forecast-accounts';
import type { ForecastFilterInfo } from './forecast-filters';
import type { ForecastDateContext } from './forecast-projection';
import type { ForecastScheduleOccurrence } from './forecast-schedules';

describe('forecast projection', () => {
  it('combines posted and scheduled deltas into running balances', () => {
    const accounts: AccountWithComputedBalance[] = [
      {
        id: 'acct-1',
        name: 'Checking',
        closed: 0,
        offbudget: 0,
        balance_current: 70,
      },
    ];
    const transactions: TransactionEntity[] = [
      {
        id: 'starting-balance',
        account: 'acct-1',
        amount: 100,
        date: '2024-03-01',
      },
      {
        id: 'posted-spend',
        account: 'acct-1',
        amount: -40,
        date: '2024-03-03',
      },
    ];
    const futureOccurrences: ForecastScheduleOccurrence[] = [
      {
        transaction: {
          id: 'occurrence-1',
          account: 'acct-1',
          amount: 10,
          date: '2024-03-02',
        },
        filterObject: {
          id: 'occurrence-1',
          amount: 10,
          date: '2024-03-02',
          notes: null,
          cleared: false,
          reconciled: false,
          transfer_id: null,
          is_parent: false,
          imported_payee: null,
          account: accounts[0],
          payee: null,
          category: null,
        },
        amount: 10,
        payee: 'Paycheck',
        scheduleId: 'sched-1',
        scheduleName: 'Paycheck',
      },
    ];
    const filterInfo: ForecastFilterInfo = {
      filters: [],
      conditionsOpKey: '$and',
      canRestrictAccounts: false,
    };
    const dateContext: ForecastDateContext = {
      forecastStartDate: '2024-03-02',
      forecastEndDate: '2024-03-04',
      forecastDays: ['2024-03-02', '2024-03-03', '2024-03-04'],
      firstForecastDate: '2024-03-02',
      endDateObj: new Date('2024-03-04T00:00:00'),
    };

    const result = projectForecastData({
      accounts,
      transactions,
      futureOccurrences,
      filterInfo,
      dateContext,
    });

    expect(result.dataPoints.map(point => point.balance)).toEqual([
      110, 70, 70,
    ]);
    expect(result.dataPoints[0].transactions).toMatchObject([
      { amount: 10, scheduleId: 'sched-1' },
    ]);
    expect(result.lowestBalance).toEqual({
      date: '2024-03-03',
      balance: 70,
      accountId: '',
      accountName: '',
    });
  });
});
