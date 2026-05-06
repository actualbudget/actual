import { describe, expect, it } from 'vitest';

import { buildBalanceForecastRequest } from './useBalanceForecast';

describe('buildBalanceForecastRequest', () => {
  it('keeps schedule forecast filters and account selection', () => {
    expect(
      buildBalanceForecastRequest({
        accountIds: ['acct'],
        conditions: [{ field: 'account', op: 'is', value: 'acct' }],
        conditionsOp: 'and',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        includeAccountlessSchedules: true,
        source: 'schedules',
      }),
    ).toEqual({
      accountIds: ['acct'],
      conditions: [{ field: 'account', op: 'is', value: 'acct' }],
      conditionsOp: 'and',
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      includeAccountlessSchedules: true,
      source: 'schedules',
    });
  });

  it('omits tracking budget filters and account selection when undefined', () => {
    expect(
      buildBalanceForecastRequest({
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        source: 'tracking-budget',
      }),
    ).toEqual({
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      source: 'tracking-budget',
    });
  });
});
