import { describe, expect, it } from 'vitest';

import { buildBalanceForecastRequest } from './useBalanceForecast';

describe('buildBalanceForecastRequest', () => {
  it('includes the saved assumptions in the forecast request', () => {
    const assumptions = {
      anchorDate: '2024-03-01',
      inflationRate: 0.03,
      salaryGrowthRate: 0.05,
      incomeScheduleIds: ['salary'],
    };
    expect(
      buildBalanceForecastRequest({
        startDate: '2024-03-01',
        endDate: '2029-03-01',
        assumptions,
      }),
    ).toMatchObject({ assumptions });
  });
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

  it('defaults to schedules when source is omitted', () => {
    expect(
      buildBalanceForecastRequest({
        startDate: '2024-03-01',
        endDate: '2024-03-31',
      }),
    ).toEqual({
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      source: 'schedules',
    });
  });
});
