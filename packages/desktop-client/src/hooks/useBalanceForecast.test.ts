import {
  clearServer,
  initServer,
} from '@actual-app/core/platform/client/connection';
import type {
  ForecastResult,
  ForecastSeries,
} from '@actual-app/core/types/models/forecast';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import {
  buildBalanceForecastRequest,
  buildBalanceForecastSeriesRequests,
  useBalanceForecastSeries,
} from './useBalanceForecast';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

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

describe('useBalanceForecastSeries while refetching', () => {
  const params = { startDate: '2024-03-01', endDate: '2024-03-31' };
  const series: ForecastSeries[] = ['checking', 'card'].map(id => ({
    id,
    name: id,
    accounts: [id],
    conditions: [],
    conditionsOp: 'and',
  }));
  const forecast: ForecastResult = {
    dataPoints: [
      {
        date: params.endDate,
        balance: 10000,
        accountId: 'checking',
        accountName: 'Checking',
        transactions: [],
      },
    ],
    lowestBalance: {
      date: params.endDate,
      balance: 10000,
      accountId: 'checking',
      accountName: 'Checking',
    },
    forecastStartDate: params.startDate,
    forecastEndDate: params.endDate,
  };
  const updatedForecast: ForecastResult = {
    ...forecast,
    dataPoints: forecast.dataPoints.map(point => ({
      ...point,
      balance: 20000,
    })),
    lowestBalance: { ...forecast.lowestBalance, balance: 20000 },
  };

  beforeEach(() => {
    initServer({ 'forecast/generate': async () => forecast });
  });

  afterEach(async () => {
    await clearServer();
  });

  it.each([
    {
      change: 'legacy account selections',
      initial: { ...params, accountIds: ['checking'] },
      updated: { ...params, accountIds: ['card'] },
    },
    {
      change: 'legacy transaction filters',
      initial: params,
      updated: {
        ...params,
        conditions: [{ field: 'amount', op: 'gt', value: 0 }],
      },
    },
    {
      change: 'named line account selections and filters',
      initial: { ...params, series },
      updated: {
        ...params,
        series: series.map(line => ({
          ...line,
          accounts: ['savings'],
          conditions: [{ field: 'amount', op: 'gt', value: 0 }],
        })),
      },
    },
    {
      change: 'the date range',
      initial: params,
      updated: { ...params, endDate: '2024-04-30' },
    },
  ] satisfies Array<{
    change: string;
    initial: Parameters<typeof useBalanceForecastSeries>[0];
    updated: Parameters<typeof useBalanceForecastSeries>[0];
  }>)(
    'keeps the report visible when changing $change',
    async ({ initial, updated }) => {
      const { result, rerender } = renderHook(
        (props: Parameters<typeof useBalanceForecastSeries>[0]) =>
          useBalanceForecastSeries(props),
        { initialProps: initial, wrapper: TestProviders },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const previousData = result.current.data;

      let completeForecast: (value: ForecastResult) => void = vi.fn();
      const pendingForecast = new Promise<ForecastResult>(resolve => {
        completeForecast = resolve;
      });
      initServer({ 'forecast/generate': () => pendingForecast });
      rerender(updated);

      expect(result.current.isFetching).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isPlaceholderData).toBe(true);
      expect(result.current.data).toBe(previousData);

      completeForecast(updatedForecast);
      await waitFor(() => expect(result.current.isFetching).toBe(false));
      expect(result.current.isPlaceholderData).toBe(false);
      expect(result.current.data?.map(line => line.forecast)).toEqual(
        previousData?.map(() => updatedForecast),
      );
    },
  );

  it.each([
    {
      change: 'adding a line',
      nextSeries: [
        ...series,
        { ...series[0], id: 'combined', accounts: ['checking', 'card'] },
      ],
    },
    { change: 'removing a line', nextSeries: series.slice(0, 1) },
    { change: 'reordering lines', nextSeries: [...series].reverse() },
    {
      change: 'replacing a line',
      nextSeries: series.map(line => ({ ...line, id: `${line.id}-new` })),
    },
  ])('discards previous results when $change', async ({ nextSeries }) => {
    const { result, rerender } = renderHook(
      (lines: ForecastSeries[]) =>
        useBalanceForecastSeries({ ...params, series: lines }),
      { initialProps: series, wrapper: TestProviders },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    let completeForecast: (value: ForecastResult) => void = vi.fn();
    const pendingForecast = new Promise<ForecastResult>(resolve => {
      completeForecast = resolve;
    });
    initServer({ 'forecast/generate': () => pendingForecast });
    rerender(nextSeries);

    expect(result.current.isFetching).toBe(true);
    expect(result.current.isPending).toBe(true);
    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.data).toBeUndefined();

    completeForecast(updatedForecast);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(
      nextSeries.map(({ id }) => ({ id, forecast: updatedForecast })),
    );
  });
});
