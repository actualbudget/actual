import { theme } from '@actual-app/components/theme';
import { setNumberFormat } from '@actual-app/core/shared/util';

import {
  compareToGoal,
  getGoalProgress,
  getGoalRingProgress,
  makeBalanceAmountStyle,
} from './util';

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('getGoalRingProgress', () => {
  it.each([
    ['underfunded', 40000, 65000, 40000, 61],
    ['underfunded with nothing budgeted', 0, 65000, 0, 0],
    ['funded', 65000, 65000, 65000, null],
    ['overfunded', 90000, 65000, 90000, null],
    ['overspent', -2500, 65000, 65000, null],
    ['overspent and underfunded', -2500, 65000, 40000, null],
    ['funded with a goal of zero', 0, 0, 0, null],
    // Long goals pass the balance as what they have
    ['a long goal short of its balance', 40000, 65000, 40000, 61],
    ['a long goal met by its balance', 70000, 65000, 70000, null],
  ] as const)(
    'is %s: balance %d, goal %d, have %d',
    (_, balance, goal, have, progress) => {
      expect(getGoalRingProgress(balance, goal, have)).toBe(progress);
    },
  );

  it('draws nothing without a goal', () => {
    expect(getGoalRingProgress(40000, null, 40000)).toBeNull();
    expect(getGoalRingProgress(0, undefined, 0)).toBeNull();
    expect(getGoalRingProgress(-2500, null, 0)).toBeNull();
  });

  it('compares the displayed amounts when decimals are hidden', () => {
    expect(getGoalRingProgress(10000, 10040, 10000)).toBe(99);
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(getGoalRingProgress(10000, 10040, 10000)).toBeNull();
    expect(getGoalRingProgress(-40, 10040, 10000)).toBeNull();
  });
});

describe('getGoalProgress', () => {
  it.each([
    [40000, 65000, 61],
    [0, 65000, 0],
    [null, 65000, 0],
    [-500, 65000, 0],
    [64999, 65000, 99],
    [65000, 65000, 100],
    [90000, 65000, 100],
    [0, 0, 100],
  ])('is %d%% when %s of %d is funded', (have, goal, progress) => {
    expect(getGoalProgress(have, goal)).toBe(progress);
  });

  it('reads 100 once the displayed amounts match', () => {
    expect(getGoalProgress(10000, 10040)).toBe(99);
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(getGoalProgress(10000, 10040)).toBe(100);
  });
});

describe('makeBalanceAmountStyle', () => {
  it('colours a balance without a goal by its sign', () => {
    expect(makeBalanceAmountStyle(-2500)).toEqual({
      color: theme.budgetNumberNegative,
    });
    expect(makeBalanceAmountStyle(40000)).toEqual({
      color: theme.budgetNumberPositive,
    });
    expect(makeBalanceAmountStyle(0)).toEqual({
      color: theme.budgetNumberZero,
    });
  });

  it('turns green once the goal is funded', () => {
    expect(makeBalanceAmountStyle(65000, 65000, 65000)).toEqual({
      color: theme.templateNumberFunded,
    });
    expect(makeBalanceAmountStyle(90000, 65000, 90000)).toEqual({
      color: theme.templateNumberFunded,
    });
    // Funded for the month and spent down to nothing is still funded
    expect(makeBalanceAmountStyle(0, 65000, 65000)).toEqual({
      color: theme.templateNumberFunded,
    });
  });

  it('leaves an unmet goal to the ring and keeps the sign colour', () => {
    expect(makeBalanceAmountStyle(40000, 65000, 40000)).toEqual({
      color: theme.budgetNumberPositive,
    });
    expect(makeBalanceAmountStyle(0, 65000, 0)).toEqual({
      color: theme.budgetNumberZero,
    });
    expect(makeBalanceAmountStyle(0, 65000, null)).toEqual({
      color: theme.budgetNumberZero,
    });
  });

  it('stays red when overspent, funded or not', () => {
    expect(makeBalanceAmountStyle(-2500, 65000, 65000)).toEqual({
      color: theme.budgetNumberNegative,
    });
    expect(makeBalanceAmountStyle(-2500, 65000, 0)).toEqual({
      color: theme.budgetNumberNegative,
    });
  });

  it('compares the displayed amounts when decimals are hidden', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(makeBalanceAmountStyle(-40)).toEqual({
      color: theme.budgetNumberZero,
    });
    expect(makeBalanceAmountStyle(10000, 10040, 10000)).toEqual({
      color: theme.templateNumberFunded,
    });
  });
});

describe('compareToGoal', () => {
  it('compares what a category has with its goal', () => {
    expect(compareToGoal(10000, 10040)).toBe(-1);
    expect(compareToGoal(10040, 10040)).toBe(0);
    expect(compareToGoal(10100, 10040)).toBe(1);
    expect(compareToGoal(null, 10040)).toBe(-1);
  });

  it('compares the displayed amounts when decimals are hidden', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(compareToGoal(10000, 10040)).toBe(0);
    expect(compareToGoal(10000, 10060)).toBe(-1);
  });
});
