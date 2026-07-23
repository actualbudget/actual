import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('parseBudgetCycleStartDay', () => {
  it('returns 1 for missing preference', () => {
    expect(monthUtils.parseBudgetCycleStartDay(undefined)).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('')).toBe(1);
  });

  it('returns valid start days', () => {
    expect(monthUtils.parseBudgetCycleStartDay('1')).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('15')).toBe(15);
    expect(monthUtils.parseBudgetCycleStartDay('28')).toBe(28);
  });

  it('safely handles invalid or corrupted stored values', () => {
    expect(monthUtils.parseBudgetCycleStartDay('0')).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('-5')).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('29')).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('31')).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('15.5')).toBe(1); // Decimal
    expect(monthUtils.parseBudgetCycleStartDay('abc')).toBe(1);
    expect(monthUtils.parseBudgetCycleStartDay('NaN')).toBe(1);
  });
});

describe('getBudgetPeriodId', () => {
  it('returns correctly for start day 1', () => {
    expect(monthUtils.getBudgetPeriodId('2026-07-01', 1)).toBe('2026-07');
    expect(monthUtils.getBudgetPeriodId('2026-07-15', 1)).toBe('2026-07');
    expect(monthUtils.getBudgetPeriodId('2026-07-31', 1)).toBe('2026-07');

    // December to January
    expect(monthUtils.getBudgetPeriodId('2026-12-31', 1)).toBe('2026-12');
    expect(monthUtils.getBudgetPeriodId('2027-01-01', 1)).toBe('2027-01');

    // January to February
    expect(monthUtils.getBudgetPeriodId('2026-01-31', 1)).toBe('2026-01');
    expect(monthUtils.getBudgetPeriodId('2026-02-01', 1)).toBe('2026-02');
  });

  it('returns correctly for start day 15', () => {
    // 2026-07-14 maps to 2026-06 (day immediately before boundary)
    expect(monthUtils.getBudgetPeriodId('2026-07-14', 15)).toBe('2026-06');
    // 2026-07-15 maps to 2026-07 (boundary day)
    expect(monthUtils.getBudgetPeriodId('2026-07-15', 15)).toBe('2026-07');
    // 2026-08-01 maps to 2026-07
    expect(monthUtils.getBudgetPeriodId('2026-08-01', 15)).toBe('2026-07');
    // 2026-08-14 maps to 2026-07
    expect(monthUtils.getBudgetPeriodId('2026-08-14', 15)).toBe('2026-07');
    // 2026-08-15 maps to 2026-08
    expect(monthUtils.getBudgetPeriodId('2026-08-15', 15)).toBe('2026-08');

    // December to January (boundary cross)
    expect(monthUtils.getBudgetPeriodId('2027-01-14', 15)).toBe('2026-12');
    expect(monthUtils.getBudgetPeriodId('2027-01-15', 15)).toBe('2027-01');

    // January to February
    expect(monthUtils.getBudgetPeriodId('2026-02-14', 15)).toBe('2026-01');
    expect(monthUtils.getBudgetPeriodId('2026-02-15', 15)).toBe('2026-02');
  });

  it('returns correctly for start day 28', () => {
    // leap-year February (2024 is leap year, 29 days)
    expect(monthUtils.getBudgetPeriodId('2024-02-27', 28)).toBe('2024-01'); // immediately before
    expect(monthUtils.getBudgetPeriodId('2024-02-28', 28)).toBe('2024-02'); // boundary day
    expect(monthUtils.getBudgetPeriodId('2024-02-29', 28)).toBe('2024-02');
    expect(monthUtils.getBudgetPeriodId('2024-03-01', 28)).toBe('2024-02');

    // non-leap-year February (2023 is non-leap year, 28 days)
    expect(monthUtils.getBudgetPeriodId('2023-02-27', 28)).toBe('2023-01');
    expect(monthUtils.getBudgetPeriodId('2023-02-28', 28)).toBe('2023-02'); // boundary day
    expect(monthUtils.getBudgetPeriodId('2023-03-01', 28)).toBe('2023-02');
  });
});

describe('getBudgetPeriodBounds', () => {
  it('returns standard bounds for start day 1', () => {
    expect(monthUtils.getBudgetPeriodBounds('2026-07', 1)).toEqual({
      start: '2026-07-01',
      end: '2026-07-31',
    });

    // Leap year Feb
    expect(monthUtils.getBudgetPeriodBounds('2024-02', 1)).toEqual({
      start: '2024-02-01',
      end: '2024-02-29',
    });

    // Non-leap year Feb
    expect(monthUtils.getBudgetPeriodBounds('2023-02', 1)).toEqual({
      start: '2023-02-01',
      end: '2023-02-28',
    });
  });

  it('returns shifted bounds for start day 15', () => {
    expect(monthUtils.getBudgetPeriodBounds('2026-07', 15)).toEqual({
      start: '2026-07-15',
      end: '2026-08-14',
    });

    // December to January (wraps around year)
    expect(monthUtils.getBudgetPeriodBounds('2026-12', 15)).toEqual({
      start: '2026-12-15',
      end: '2027-01-14',
    });
  });

  it('returns shifted bounds for start day 28', () => {
    expect(monthUtils.getBudgetPeriodBounds('2026-07', 28)).toEqual({
      start: '2026-07-28',
      end: '2026-08-27',
    });

    // January to February (leap year)
    expect(monthUtils.getBudgetPeriodBounds('2024-01', 28)).toEqual({
      start: '2024-01-28',
      end: '2024-02-27',
    });

    // January to February (non-leap year)
    expect(monthUtils.getBudgetPeriodBounds('2023-01', 28)).toEqual({
      start: '2023-01-28',
      end: '2023-02-27',
    });
  });
});

describe('getPreviousBudgetPeriod', () => {
  it('returns previous budget period ID', () => {
    expect(monthUtils.getPreviousBudgetPeriod('2026-07')).toBe('2026-06');
    expect(monthUtils.getPreviousBudgetPeriod('2026-01')).toBe('2025-12'); // Dec to Jan
  });
});

describe('getNextBudgetPeriod', () => {
  it('returns next budget period ID', () => {
    expect(monthUtils.getNextBudgetPeriod('2026-07')).toBe('2026-08');
    expect(monthUtils.getNextBudgetPeriod('2025-12')).toBe('2026-01'); // Dec to Jan
  });
});

describe('formatBudgetPeriod', () => {
  it('formats correctly for start day 1', () => {
    // Should match standard formatting "MMMM ''yy"
    expect(monthUtils.formatBudgetPeriod('2026-07', 1)).toBe("July '26");
  });

  it('formats correctly for start day > 1', () => {
    // custom formatting using abbreviated dates
    expect(monthUtils.formatBudgetPeriod('2026-07', 15)).toBe(
      'Jul 15 - Aug 14',
    );
    expect(monthUtils.formatBudgetPeriod('2026-12', 15)).toBe(
      'Dec 15 - Jan 14',
    );
  });
});
