import { theme } from '@actual-app/components/theme';
import { setNumberFormat } from '@actual-app/core/shared/util';

import {
  compareToGoal,
  getGoalFundingState,
  getGoalProgress,
  makeBalanceAmountStyle,
} from './util';

afterEach(() => {
  setNumberFormat({ format: 'comma-dot', hideFraction: false });
});

describe('getGoalFundingState', () => {
  it.each([
    ['overspent', -2500, 65000, 65000],
    ['underfunded', 40000, 65000, 40000],
    ['underfunded', 0, 65000, 0],
    ['funded', 65000, 65000, 65000],
    ['funded', 90000, 65000, 90000],
    ['funded', 0, 0, 0],
  ] as const)(
    'is %s for balance %d, goal %d and have %d',
    (state, balance, goal, have) => {
      expect(getGoalFundingState(balance, goal, have)).toBe(state);
    },
  );

  it('has no goal state without a goal, except when overspent', () => {
    expect(getGoalFundingState(40000, null, 40000)).toBeNull();
    expect(getGoalFundingState(0, undefined, 0)).toBeNull();
    expect(getGoalFundingState(-2500, null, 0)).toBe('overspent');
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
  it('colours the balance by its sign alone', () => {
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

  it('treats a balance that rounds to zero as zero when decimals are hidden', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(makeBalanceAmountStyle(-40)).toEqual({
      color: theme.budgetNumberZero,
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
    expect(getGoalFundingState(10000, 10040, 10000)).toBe('funded');
    expect(compareToGoal(10000, 10060)).toBe(-1);
  });
});
