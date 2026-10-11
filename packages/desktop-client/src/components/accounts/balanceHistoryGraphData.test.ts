import type { ForecastDataPoint } from '@actual-app/core/types/models/forecast';
import { describe, expect, it } from 'vitest';

import {
  buildDailyBalancePoints,
  clampRange,
  getBalanceChange,
  getBalanceOnDate,
  getDateAtRatio,
  getDefaultRange,
  getLowestProjectedPoint,
  getNearestPoint,
  getPointsInRange,
  getRatioOfDate,
} from './balanceHistoryGraphData';

function dataPoint(
  date: string,
  balance: number,
  accountId = 'checking',
): ForecastDataPoint {
  return {
    date,
    balance,
    accountId,
    accountName: accountId,
    transactions: [],
  };
}

describe('buildDailyBalancePoints', () => {
  it('combines balances across accounts on each day', () => {
    const points = buildDailyBalancePoints(
      [
        dataPoint('2024-03-01', 1000, 'checking'),
        dataPoint('2024-03-01', -400, 'credit'),
        dataPoint('2024-03-02', 900, 'checking'),
        dataPoint('2024-03-02', -400, 'credit'),
      ],
      '2024-03-02',
    );

    expect(points.map(p => [p.date, p.balance])).toEqual([
      ['2024-03-01', 600],
      ['2024-03-02', 500],
    ]);
  });

  it('keeps only the days where the balance changes, plus the anchors', () => {
    const points = buildDailyBalancePoints(
      [
        dataPoint('2024-03-01', 100),
        dataPoint('2024-03-02', 100),
        dataPoint('2024-03-03', 150),
        dataPoint('2024-03-04', 150),
        dataPoint('2024-03-05', 150),
        dataPoint('2024-03-06', 150),
      ],
      '2024-03-04',
    );

    expect(points.map(p => p.date)).toEqual([
      '2024-03-01',
      '2024-03-03',
      '2024-03-04',
      '2024-03-06',
    ]);
  });

  it('splits posted and projected balances at today, sharing that point', () => {
    const points = buildDailyBalancePoints(
      [
        dataPoint('2024-03-01', 100),
        dataPoint('2024-03-02', 200),
        dataPoint('2024-03-03', 50),
      ],
      '2024-03-02',
    );

    expect(points.map(p => [p.date, p.actual, p.projected])).toEqual([
      ['2024-03-01', 100, null],
      ['2024-03-02', 200, 200],
      ['2024-03-03', null, 50],
    ]);
  });
});

describe('getBalanceOnDate', () => {
  const points = buildDailyBalancePoints(
    [
      dataPoint('2024-03-01', 100),
      dataPoint('2024-03-02', 100),
      dataPoint('2024-03-03', 300),
    ],
    '2024-03-03',
  );

  it('returns the balance of the last change on or before the date', () => {
    expect(getBalanceOnDate(points, '2024-03-02')).toBe(100);
    expect(getBalanceOnDate(points, '2024-03-03')).toBe(300);
    expect(getBalanceOnDate(points, '2024-12-31')).toBe(300);
  });

  it('returns zero before the first transaction', () => {
    expect(getBalanceOnDate(points, '2024-02-01')).toBe(0);
  });
});

describe('getDefaultRange', () => {
  it('shows the last year of history and the whole projection', () => {
    const points = buildDailyBalancePoints(
      [
        dataPoint('2022-01-01', 100),
        dataPoint('2024-05-31', 200),
        dataPoint('2024-09-01', 300),
      ],
      '2024-05-31',
    );

    expect(getDefaultRange(points, '2024-05-31')).toEqual({
      start: '2023-05-31',
      end: '2024-09-01',
    });
  });

  it('starts at the first point when the history is shorter', () => {
    const points = buildDailyBalancePoints(
      [dataPoint('2024-03-01', 100), dataPoint('2024-05-31', 200)],
      '2024-05-31',
    );

    expect(getDefaultRange(points, '2024-05-31')).toEqual({
      start: '2024-03-01',
      end: '2024-05-31',
    });
  });

  it('returns null without points', () => {
    expect(getDefaultRange([], '2024-05-31')).toBeNull();
  });
});

describe('clampRange', () => {
  const points = buildDailyBalancePoints(
    [dataPoint('2024-01-01', 100), dataPoint('2024-12-31', 200)],
    '2024-06-01',
  );

  it('keeps the range within the points', () => {
    expect(
      clampRange(points, { start: '2023-01-01', end: '2025-01-01' }),
    ).toEqual({ start: '2024-01-01', end: '2024-12-31' });
    expect(
      clampRange(points, { start: '2024-03-01', end: '2024-04-01' }),
    ).toEqual({ start: '2024-03-01', end: '2024-04-01' });
  });

  it('falls back to every point when nothing is left of the range', () => {
    expect(
      clampRange(points, { start: '2025-03-01', end: '2025-04-01' }),
    ).toEqual({ start: '2024-01-01', end: '2024-12-31' });
  });
});

describe('getPointsInRange', () => {
  const points = buildDailyBalancePoints(
    [
      dataPoint('2024-01-01', 100),
      dataPoint('2024-02-01', 300),
      dataPoint('2024-04-01', 500),
      dataPoint('2024-05-01', 700),
    ],
    '2024-03-01',
  );

  it('starts and ends on the range bounds with the balance carried over', () => {
    expect(
      getPointsInRange(
        points,
        { start: '2024-01-15', end: '2024-04-15' },
        '2024-03-01',
      ).map(p => [p.date, p.balance]),
    ).toEqual([
      ['2024-01-15', 100],
      ['2024-02-01', 300],
      ['2024-04-01', 500],
      ['2024-04-15', 500],
    ]);
  });
});

describe('getDateAtRatio', () => {
  const range = { start: '2024-03-01', end: '2024-03-11' };

  it('converts a horizontal position into a day of the range', () => {
    expect(getDateAtRatio(range, 0)).toBe('2024-03-01');
    expect(getDateAtRatio(range, 0.52)).toBe('2024-03-06');
    expect(getDateAtRatio(range, 1)).toBe('2024-03-11');
    expect(getDateAtRatio(range, 2)).toBe('2024-03-11');
  });

  it('is the inverse of getRatioOfDate', () => {
    expect(getRatioOfDate(range, '2024-03-06')).toBe(0.5);
    expect(getDateAtRatio(range, getRatioOfDate(range, '2024-03-04'))).toBe(
      '2024-03-04',
    );
  });
});

describe('getNearestPoint', () => {
  const points = buildDailyBalancePoints(
    [
      dataPoint('2024-03-01', 100),
      dataPoint('2024-03-08', 200),
      dataPoint('2024-03-11', 300),
    ],
    '2024-03-11',
  );

  it('snaps the horizontal position to the closest day with a change', () => {
    expect(getNearestPoint(points, 0)?.date).toBe('2024-03-01');
    expect(getNearestPoint(points, 0.3)?.date).toBe('2024-03-01');
    expect(getNearestPoint(points, 0.6)?.date).toBe('2024-03-08');
    expect(getNearestPoint(points, 0.95)?.date).toBe('2024-03-11');
  });

  it('clamps positions outside the graph', () => {
    expect(getNearestPoint(points, -1)?.date).toBe('2024-03-01');
    expect(getNearestPoint(points, 2)?.date).toBe('2024-03-11');
  });

  it('returns null without points', () => {
    expect(getNearestPoint([], 0.5)).toBeNull();
  });
});

describe('getLowestProjectedPoint', () => {
  it('returns the lowest future balance when it drops below today', () => {
    const points = buildDailyBalancePoints(
      [
        dataPoint('2024-03-01', 500),
        dataPoint('2024-03-05', -200),
        dataPoint('2024-03-10', 800),
      ],
      '2024-03-01',
    );

    expect(getLowestProjectedPoint(points, '2024-03-01')).toMatchObject({
      date: '2024-03-05',
      balance: -200,
    });
  });

  it('returns null when the balance never drops below today', () => {
    const points = buildDailyBalancePoints(
      [dataPoint('2024-03-01', 500), dataPoint('2024-03-05', 900)],
      '2024-03-01',
    );

    expect(getLowestProjectedPoint(points, '2024-03-01')).toBeNull();
  });
});

describe('getBalanceChange', () => {
  it('compares the balance between two dates', () => {
    const points = buildDailyBalancePoints(
      [dataPoint('2023-01-01', 1000), dataPoint('2024-03-01', 1500)],
      '2024-03-01',
    );

    expect(getBalanceChange(points, '2023-03-01', '2024-03-01')).toBe(50);
  });

  it('returns zero when there was no balance at the start', () => {
    const points = buildDailyBalancePoints(
      [dataPoint('2024-01-01', 1000), dataPoint('2024-03-01', 1500)],
      '2024-03-01',
    );

    expect(getBalanceChange(points, '2023-03-01', '2024-03-01')).toBe(0);
  });
});
