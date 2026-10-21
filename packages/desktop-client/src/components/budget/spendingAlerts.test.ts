import {
  getSpendingAlertStatus,
  parseSpendingWarningPref,
} from './spendingAlerts';
import type { SpendingAlertInput } from './spendingAlerts';
import { isOverspentBalance } from './util';

// October has 31 days: on the 11th there are 20 days left, on the 21st 10.
function status(overrides: Partial<SpendingAlertInput>) {
  return getSpendingAlertStatus({
    month: '2026-10',
    today: '2026-10-11',
    budgeted: 10000,
    sumAmount: 0,
    balance: 10000,
    isIncome: false,
    isHidden: false,
    ...overrides,
  });
}

// Spending `spent` out of a 100.00 budget with nothing rolled over
function spending(spent: number) {
  return { sumAmount: -spent, balance: 10000 - spent };
}

describe('getSpendingAlertStatus', () => {
  it('warns at exactly 50% spent with 20 days left', () => {
    expect(status(spending(5000))).toEqual({
      tier: 'warn50',
      percentSpent: 50,
      daysRemaining: 20,
    });
  });

  it('does not warn just under 50% spent', () => {
    expect(status(spending(4999)).tier).toBeNull();
  });

  it('does not warn at 50% spent with 19 days left', () => {
    expect(status({ ...spending(5000), today: '2026-10-12' }).tier).toBeNull();
  });

  it('warns at exactly 80% spent with 10 days left', () => {
    expect(status({ ...spending(8000), today: '2026-10-21' })).toEqual({
      tier: 'warn80',
      percentSpent: 80,
      daysRemaining: 10,
    });
  });

  it('does not warn at 80% spent with 9 days left', () => {
    expect(status({ ...spending(8000), today: '2026-10-22' }).tier).toBeNull();
  });

  it('shows the stronger tier when both apply', () => {
    expect(status(spending(8500)).tier).toBe('warn80');
  });

  it('gives overspending priority over the warning tiers', () => {
    expect(status(spending(12000))).toEqual({
      tier: 'overspent',
      percentSpent: null,
      daysRemaining: null,
    });
  });

  it('skips categories with no budget', () => {
    expect(status({ budgeted: 0, sumAmount: 0, balance: 0 }).tier).toBeNull();
    expect(
      status({ budgeted: null, sumAmount: 0, balance: 0 }).tier,
    ).toBeNull();
    // Even with money rolled over from last month
    expect(
      status({ budgeted: 0, sumAmount: -9000, balance: 1000 }).tier,
    ).toBeNull();
  });

  it('skips hidden categories, even when overspent', () => {
    expect(status({ ...spending(9000), isHidden: true }).tier).toBeNull();
    expect(status({ ...spending(12000), isHidden: true }).tier).toBeNull();
  });

  it('skips income categories, even when overspent', () => {
    expect(status({ ...spending(9000), isIncome: true }).tier).toBeNull();
    expect(status({ ...spending(12000), isIncome: true }).tier).toBeNull();
  });

  it('does not warn for a past month, but still reports overspending', () => {
    expect(status({ ...spending(9000), month: '2026-09' }).tier).toBeNull();
    expect(status({ ...spending(12000), month: '2026-09' }).tier).toBe(
      'overspent',
    );
  });

  it('does not warn for a future month', () => {
    expect(status({ ...spending(9000), month: '2026-11' }).tier).toBeNull();
  });

  it('does not warn on the last day of the month', () => {
    expect(status({ ...spending(9000), today: '2026-10-31' })).toEqual({
      tier: null,
      percentSpent: null,
      daysRemaining: null,
    });
  });

  it('measures spending against the budget plus money rolled over', () => {
    // 100.00 budgeted + 100.00 rolled over, 50.00 spent: 25% of 200.00
    expect(
      status({ budgeted: 10000, sumAmount: -5000, balance: 15000 }).tier,
    ).toBeNull();
    // 100.00 budgeted + 100.00 rolled over, 170.00 spent: 85% of 200.00
    expect(
      status({ budgeted: 10000, sumAmount: -17000, balance: 3000 }),
    ).toMatchObject({ tier: 'warn80', percentSpent: 85 });
  });

  it('counts refunds against spending', () => {
    // Net activity of +10.00 means nothing was spent
    expect(
      status({ budgeted: 10000, sumAmount: 1000, balance: 11000 }).tier,
    ).toBeNull();
  });
});

describe('getSpendingAlertStatus with custom thresholds', () => {
  const thresholds = {
    warn50: { minPercentSpent: 40, minDaysRemaining: 25 },
    warn80: { minPercentSpent: 70, minDaysRemaining: 15 },
  };

  it('uses the given thresholds', () => {
    // 1st of the month: 30 days left
    const firstOfMonth = { today: '2026-10-01' };
    expect(
      getSpendingAlertStatus(
        {
          month: '2026-10',
          budgeted: 10000,
          isIncome: false,
          isHidden: false,
          ...firstOfMonth,
          ...spending(4000),
        },
        thresholds,
      ).tier,
    ).toBe('warn50');
    expect(
      getSpendingAlertStatus(
        {
          month: '2026-10',
          budgeted: 10000,
          isIncome: false,
          isHidden: false,
          ...firstOfMonth,
          ...spending(7000),
        },
        thresholds,
      ).tier,
    ).toBe('warn80');
  });

  it('checks the higher percentage first even if the tiers are swapped', () => {
    const swapped = {
      warn50: { minPercentSpent: 90, minDaysRemaining: 5 },
      warn80: { minPercentSpent: 30, minDaysRemaining: 5 },
    };
    expect(
      getSpendingAlertStatus(
        {
          month: '2026-10',
          today: '2026-10-11',
          budgeted: 10000,
          isIncome: false,
          isHidden: false,
          ...spending(9500),
        },
        swapped,
      ).tier,
    ).toBe('warn50');
  });
});

describe('parseSpendingWarningPref', () => {
  it('reads valid values', () => {
    expect(parseSpendingWarningPref('65', 'percent', 50)).toBe(65);
    expect(parseSpendingWarningPref('0', 'days', 20)).toBe(0);
  });

  it('falls back to the default for empty or invalid values', () => {
    expect(parseSpendingWarningPref(undefined, 'percent', 50)).toBe(50);
    expect(parseSpendingWarningPref('', 'percent', 50)).toBe(50);
    expect(parseSpendingWarningPref('abc', 'percent', 50)).toBe(50);
    expect(parseSpendingWarningPref('12.5', 'percent', 50)).toBe(50);
    expect(parseSpendingWarningPref('0', 'percent', 50)).toBe(50);
    expect(parseSpendingWarningPref('101', 'percent', 50)).toBe(50);
    expect(parseSpendingWarningPref('31', 'days', 20)).toBe(20);
    expect(parseSpendingWarningPref('-1', 'days', 20)).toBe(20);
  });
});

describe('isOverspentBalance', () => {
  it('treats negative balances as overspent', () => {
    expect(isOverspentBalance(-1)).toBe(true);
    expect(isOverspentBalance(-15000)).toBe(true);
  });

  it('does not treat zero, positive or missing balances as overspent', () => {
    expect(isOverspentBalance(0)).toBe(false);
    expect(isOverspentBalance(2500)).toBe(false);
    expect(isOverspentBalance(null)).toBe(false);
    expect(isOverspentBalance(undefined)).toBe(false);
  });
});
