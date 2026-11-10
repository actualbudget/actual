import { describe, expect, it } from 'vitest';

import type {
  ForecastDataPoint,
  ForecastTransaction,
} from '#types/models/forecast';

import {
  getForecastRange,
  summarizeForecastContributors,
} from './forecast-contributors';

function scheduled(
  scheduleId: string,
  amount: number,
  extra: Partial<ForecastTransaction> = {},
): ForecastTransaction {
  return {
    scheduleId,
    scheduleName: scheduleId,
    payee: null,
    amount,
    ...extra,
  };
}

function point(
  date: string,
  balance: number,
  transactions: ForecastTransaction[] = [],
  recordedAmount = 0,
  accountId = 'checking',
): ForecastDataPoint {
  return {
    date,
    balance,
    accountId,
    accountName: accountId,
    transactions,
    recordedAmount,
  };
}

describe('forecast contributors', () => {
  it('ranks all schedules by their total impact and reconciles first-day activity', () => {
    const summary = summarizeForecastContributors(
      [
        point(
          '2024-03-01',
          130_000,
          [scheduled('salary', 50_000), scheduled('rent', -30_000)],
          10_000,
        ),
        point('2024-03-15', 144_000, [
          scheduled('salary', 50_000),
          scheduled('rent', -30_000),
          ...Array.from({ length: 6 }, (_, index) =>
            scheduled(`bill-${index}`, -1_000),
          ),
        ]),
        point('2024-03-31', 139_000, [], -5_000),
      ],
      '2024-03-01',
      '2024-03-31',
    );

    expect(summary).toMatchObject({
      openingBalance: 100_000,
      endingBalance: 139_000,
      recordedNet: 5_000,
      scheduledNet: 34_000,
    });
    expect(summary?.inflows).toMatchObject([
      { scheduleId: 'salary', amount: 100_000, count: 2 },
    ]);
    expect(summary?.outflows).toHaveLength(7);
    expect(summary?.outflows[0]).toMatchObject({
      scheduleId: 'rent',
      amount: -60_000,
      count: 2,
    });
  });

  it('nets transfer legs before ranking and counts each occurrence only once', () => {
    const points = [
      point('2024-03-01', -10_000, [
        scheduled('savings', -10_000, { isTransfer: true }),
      ]),
      point(
        '2024-03-01',
        10_000,
        [scheduled('savings', 10_000, { isTransfer: true })],
        0,
        'savings',
      ),
      point('2024-03-02', -20_000, [
        scheduled('savings', -10_000, { isTransfer: true }),
      ]),
      point(
        '2024-03-02',
        20_000,
        [scheduled('savings', 10_000, { isTransfer: true })],
        0,
        'savings',
      ),
    ];
    expect(
      summarizeForecastContributors(points, '2024-03-01', '2024-03-02'),
    ).toMatchObject({
      inflows: [],
      outflows: [],
      scheduledNet: 0,
      internalTransferCount: 2,
      endingBalance: 0,
    });
    // An account/payee filter can leave only one leg in the chart.
    expect(
      summarizeForecastContributors(
        points.filter(p => p.accountId === 'savings'),
        '2024-03-01',
        '2024-03-02',
      ),
    ).toMatchObject({
      inflows: [
        { scheduleId: 'savings', amount: 20_000, count: 2, isTransfer: true },
      ],
      scheduledNet: 20_000,
      endingBalance: 20_000,
    });
  });

  it('nets the original occurrence when rules move transfer legs to different dates', () => {
    const points = [
      point('2024-03-01', -100, [
        scheduled('transfer', -100, {
          isTransfer: true,
          occurrenceDate: '2024-03-01',
        }),
      ]),
      point('2024-03-02', -100),
      point('2024-03-01', 0, [], 0, 'savings'),
      point(
        '2024-03-02',
        100,
        [
          scheduled('transfer', 100, {
            isTransfer: true,
            occurrenceDate: '2024-03-01',
          }),
        ],
        0,
        'savings',
      ),
    ];
    expect(
      summarizeForecastContributors(points, '2024-03-01', '2024-03-02'),
    ).toMatchObject({
      inflows: [],
      outflows: [],
      scheduledNet: 0,
      internalTransferCount: 1,
      endingBalance: 0,
    });
    // Only the leg inside the selected date range contributes to its change.
    expect(
      summarizeForecastContributors(points, '2024-03-02', '2024-03-02'),
    ).toMatchObject({
      openingBalance: -100,
      scheduledNet: 100,
      endingBalance: 0,
      inflows: [{ scheduleId: 'transfer', count: 1, amount: 100 }],
    });
  });

  it('keeps schedule identities and directions distinct, including accountless occurrences', () => {
    const summary = summarizeForecastContributors(
      [
        point('2024-03-01', 100, [
          scheduled('a', 100, { scheduleName: 'Same name' }),
          scheduled('b', -100, { scheduleName: 'Same name' }),
          scheduled('a', 100, {
            scheduleName: 'Same name',
            isAccountless: true,
          }),
        ]),
        point('2024-03-02', 50, [
          scheduled('a', -50, { scheduleName: 'Same name' }),
        ]),
      ],
      '2024-03-01',
      '2024-03-02',
    );
    expect(summary?.inflows).toMatchObject([
      { scheduleId: 'a', amount: 200, count: 1, isAccountless: true },
    ]);
    expect(summary?.outflows).toMatchObject([
      { scheduleId: 'b', amount: -100 },
      { scheduleId: 'a', amount: -50 },
    ]);
    expect(summary?.scheduledNet).toBe(50);
  });

  it('uses exact daily boundaries and carries the balance before the selected start', () => {
    const summary = summarizeForecastContributors(
      [
        point('2024-03-31', 175, [scheduled('bill', -25)]),
        point('2024-03-01', 100, [scheduled('salary', 100)]),
        point('2024-03-20', 200, [], 50),
        point('2024-03-15', 150, [scheduled('salary', 50)]),
      ],
      '2024-03-15',
      '2024-03-20',
    );
    expect(summary).toMatchObject({
      openingBalance: 100,
      recordedNet: 50,
      scheduledNet: 50,
      endingBalance: 200,
      outflows: [],
    });
  });

  it('reconciles a historical range without attributing recorded transactions to schedules', () => {
    expect(
      summarizeForecastContributors(
        [point('2024-01-10', 300, [], -200)],
        '2024-01-01',
        '2024-01-31',
      ),
    ).toMatchObject({
      openingBalance: 500,
      recordedNet: -200,
      scheduledNet: 0,
      endingBalance: 300,
      inflows: [],
      outflows: [],
    });
  });

  it('does not invent provenance for empty or older forecast responses', () => {
    expect(
      summarizeForecastContributors([], '2024-03-01', '2024-03-31'),
    ).toBeNull();
    expect(
      summarizeForecastContributors(
        [
          {
            date: '2024-03-01',
            balance: 100,
            accountId: 'a',
            accountName: 'A',
            transactions: [],
          },
        ],
        '2024-03-01',
        '2024-03-31',
      ),
    ).toBeNull();
  });
});

describe('forecast range', () => {
  it('widens monthly bounds and preserves daily bounds, including leap days', () => {
    expect(getForecastRange('2024-02-10', '2024-02-20', 'Monthly')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
    expect(getForecastRange('2024-02-10', '2024-02-20', 'Daily')).toEqual({
      startDate: '2024-02-10',
      endDate: '2024-02-20',
    });
    expect(getForecastRange('2024-02', '2024-02', 'Daily')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
  });
});
