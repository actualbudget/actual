import { describe, expect, it } from 'vitest';

import {
  buildBalanceForecastRequest,
  buildBalanceForecastSeriesRequests,
} from './useBalanceForecast';

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

describe('buildBalanceForecastSeriesRequests', () => {
  const params = {
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    accountIds: ['legacy-account'],
    conditionsOp: 'and' as const,
    conditions: [
      { field: 'account' as const, op: 'is' as const, value: 'legacy-account' },
    ],
    includeAccountlessSchedules: false,
  };

  it('keeps legacy widgets and empty series identical to a single forecast', () => {
    for (const series of [undefined, []]) {
      expect(buildBalanceForecastSeriesRequests(series, params)).toEqual([
        { id: 'balance', request: buildBalanceForecastRequest(params) },
      ]);
    }
  });

  it('uses independent account restrictions and OR filters without inheriting legacy filters', () => {
    const result = buildBalanceForecastSeriesRequests(
      [
        {
          id: 'one',
          name: 'One',
          accounts: [],
          conditions: [],
          conditionsOp: 'and',
        },
        {
          id: 'two',
          name: 'Two',
          conditions: [
            { field: 'account', op: 'is', value: 'card' },
            { field: 'notes', op: 'contains', value: 'subscription' },
          ],
          conditionsOp: 'or',
        },
      ],
      params,
    );
    expect(result[0].request).toEqual({
      startDate: params.startDate,
      endDate: params.endDate,
      source: 'schedules',
      accountIds: [],
      conditions: [],
      conditionsOp: 'and',
      includeAccountlessSchedules: false,
    });
    expect(result[1].request).toEqual({
      startDate: params.startDate,
      endDate: params.endDate,
      source: 'schedules',
      conditions: [
        { field: 'account', op: 'is', value: 'card' },
        { field: 'notes', op: 'contains', value: 'subscription' },
      ],
      conditionsOp: 'or',
      includeAccountlessSchedules: true,
    });
  });

  it('leaves tracking forecasts as one whole-budget forecast', () => {
    const trackingParams = {
      startDate: params.startDate,
      endDate: params.endDate,
      source: 'tracking-budget' as const,
    };
    expect(
      buildBalanceForecastSeriesRequests(
        [
          {
            id: 'one',
            name: 'Cash',
            accounts: ['checking'],
            conditions: [],
            conditionsOp: 'and',
          },
        ],
        trackingParams,
      ),
    ).toEqual([
      { id: 'balance', request: buildBalanceForecastRequest(trackingParams) },
    ]);
  });
});
