import { theme } from '@actual-app/components/theme';
import { setNumberFormat } from '@actual-app/core/shared/util';

import { getGoalDifference, makeBalanceAmountStyle } from './util';

describe('getGoalDifference', () => {
  afterEach(() => {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
  });

  it('measures what a category has against its goal', () => {
    expect(getGoalDifference(10000, 10040)).toBe(-40);
    expect(getGoalDifference(10040, 10040)).toBe(0);
    expect(getGoalDifference(10100, 10040)).toBe(60);
    expect(getGoalDifference(null, 10040)).toBe(-10040);
  });

  it('measures the displayed amounts when decimals are hidden', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(getGoalDifference(10000, 10040)).toBe(0);
    expect(getGoalDifference(10000, 10060)).toBe(-100);
    // 100 against 101, not the one cent between them
    expect(getGoalDifference(10049, 10050)).toBe(-100);
    expect(makeBalanceAmountStyle(10000, 10040, 10000)).toEqual({
      color: theme.templateNumberFunded,
    });
  });

  it('greys a balance that displays as zero when fractions are hidden', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(makeBalanceAmountStyle(40)).toEqual({
      color: theme.budgetNumberZero,
    });
    expect(makeBalanceAmountStyle(-40)).toEqual({
      color: theme.budgetNumberZero,
    });
  });

  it('measures whole units for currencies without decimals', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(getGoalDifference(39950, 40049, 0)).toBe(-99);
    expect(getGoalDifference(40049, 40049, 0)).toBe(0);
    expect(makeBalanceAmountStyle(39950, 40049, 39950, 0)).toEqual({
      color: theme.templateNumberUnderFunded,
    });
  });
});

describe('three-decimal displayed goal amounts', () => {
  afterEach(() =>
    setNumberFormat({ format: 'comma-dot', hideFraction: false }),
  );
  it.each(['comma-dot', 'dot-comma', 'apostrophe-dot'] as const)(
    'keeps sub-cent differences in %s format',
    format => {
      setNumberFormat({ format, hideFraction: false });
      expect(getGoalDifference(1009, 1000, 3)).toBe(9);
      expect(getGoalDifference(1000, 1001, 3)).toBe(-1);
      expect(makeBalanceAmountStyle(-4, undefined, undefined, 3)).toEqual({
        color: theme.budgetNumberNegative,
      });
    },
  );
  it('still compares rounded whole units when fractions are hidden', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(getGoalDifference(1000, 1001, 3)).toBe(0);
    expect(getGoalDifference(1000, 1600, 3)).toBe(-1000);
  });
});
