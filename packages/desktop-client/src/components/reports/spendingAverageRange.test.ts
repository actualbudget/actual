import {
  DEFAULT_SPENDING_AVERAGE_RANGE,
  getSpendingAverageSummaryLabel,
  resolveSpendingAverageRange,
  spendingAverageRangeFromKey,
  spendingAverageRangeToKey,
} from './spendingAverageRange';

const t = (key: string, options?: Record<string, string | number>) =>
  options
    ? Object.entries(options).reduce(
        (message, [optionKey, value]) =>
          message.replace(`{{${optionKey}}}`, String(value)),
        key,
      )
    : key;

describe('spending average range metadata', () => {
  it('defaults missing metadata to the existing last 3 months behavior', () => {
    expect(spendingAverageRangeToKey()).toBe('last-3-months');
    expect(DEFAULT_SPENDING_AVERAGE_RANGE).toEqual({
      mode: 'last-n-months',
      months: 3,
    });
  });

  it('round-trips supported dropdown options', () => {
    expect(spendingAverageRangeFromKey('last-6-months')).toEqual({
      mode: 'last-n-months',
      months: 6,
    });
    expect(
      spendingAverageRangeToKey({
        mode: 'last-n-months',
        months: 12,
      }),
    ).toBe('last-12-months');
    expect(spendingAverageRangeFromKey('year-to-date')).toEqual({
      mode: 'year-to-date',
    });
    expect(spendingAverageRangeFromKey('all-time')).toEqual({
      mode: 'all-time',
    });
  });
});

describe('resolveSpendingAverageRange', () => {
  it('uses months before the selected compare month for last-n-months ranges', () => {
    expect(
      resolveSpendingAverageRange({
        averageRange: { mode: 'last-n-months', months: 6 },
        compare: '2026-05',
      }),
    ).toEqual({
      startMonth: '2025-11',
      endMonth: '2026-04',
      months: [
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
      ],
    });
  });

  it('uses elapsed months in the compare year for year-to-date ranges', () => {
    expect(
      resolveSpendingAverageRange({
        averageRange: { mode: 'year-to-date' },
        compare: '2026-05',
      }),
    ).toEqual({
      startMonth: '2026-01',
      endMonth: '2026-04',
      months: ['2026-01', '2026-02', '2026-03', '2026-04'],
    });
  });

  it('returns an empty range for year-to-date January comparisons', () => {
    expect(
      resolveSpendingAverageRange({
        averageRange: { mode: 'year-to-date' },
        compare: '2026-01',
      }),
    ).toEqual({
      startMonth: null,
      endMonth: null,
      months: [],
    });
  });

  it('uses all complete months before compare for all-time ranges', () => {
    expect(
      resolveSpendingAverageRange({
        averageRange: { mode: 'all-time' },
        compare: '2026-05',
        earliestMonth: '2024-02',
      }),
    ).toEqual({
      startMonth: '2024-02',
      endMonth: '2026-04',
      months: [
        '2024-02',
        '2024-03',
        '2024-04',
        '2024-05',
        '2024-06',
        '2024-07',
        '2024-08',
        '2024-09',
        '2024-10',
        '2024-11',
        '2024-12',
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
      ],
    });
  });

  it('returns an empty all-time range when there are no complete months before compare', () => {
    expect(
      resolveSpendingAverageRange({
        averageRange: { mode: 'all-time' },
        compare: '2026-05',
        earliestMonth: '2026-05',
      }),
    ).toEqual({
      startMonth: null,
      endMonth: null,
      months: [],
    });
  });
});

describe('getSpendingAverageSummaryLabel', () => {
  it('describes current-month average MTD by selected range', () => {
    expect(
      getSpendingAverageSummaryLabel({
        averageRange: { mode: 'all-time' },
        isCurrentMonth: true,
        t,
      }),
    ).toBe('Spent Average MTD (All time):');
  });

  it('describes completed-month averages by selected range', () => {
    expect(
      getSpendingAverageSummaryLabel({
        averageRange: { mode: 'last-n-months', months: 12 },
        isCurrentMonth: false,
        t,
      }),
    ).toBe('Spent Average (Last 12 months):');
  });
});
