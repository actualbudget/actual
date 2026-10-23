import { theme } from '@actual-app/components/theme';
import { setNumberFormat } from '@actual-app/core/shared/util';

import {
  compareToGoal,
  getGoalFundingState,
  makeBalanceAmountStyle,
} from './util';

describe('getGoalFundingState', () => {
  it.each([
    ['overspent', -2500, 65000, 65000, theme.budgetNumberNegative],
    ['underfunded', 40000, 65000, 40000, theme.templateNumberUnderFunded],
    ['underfunded', 0, 65000, 0, theme.templateNumberUnderFunded],
    ['funded', 65000, 65000, 65000, theme.templateNumberFunded],
    ['funded', 90000, 65000, 90000, theme.templateNumberFunded],
    ['funded', 0, 0, 0, theme.templateNumberFunded],
  ] as const)(
    'is %s for balance %d, goal %d, have %d and matches the balance colour',
    (state, balance, goal, have, color) => {
      expect(getGoalFundingState(balance, goal, have)).toBe(state);
      expect(makeBalanceAmountStyle(balance, goal, have)).toEqual({ color });
    },
  );

  it('has no goal state without a goal, except when overspent', () => {
    expect(getGoalFundingState(40000, null, 40000)).toBeNull();
    expect(getGoalFundingState(0, undefined, 0)).toBeNull();
    expect(getGoalFundingState(-2500, null, 0)).toBe('overspent');
    expect(makeBalanceAmountStyle(40000, null, 40000)).toEqual({
      color: theme.budgetNumberPositive,
    });
    expect(makeBalanceAmountStyle(0, null, 0)).toEqual({
      color: theme.budgetNumberZero,
    });
  });
});

describe('compareToGoal', () => {
  afterEach(() => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
  });

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
