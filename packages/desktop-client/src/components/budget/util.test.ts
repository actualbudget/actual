import { theme } from '@actual-app/components/theme';
import { setNumberFormat } from '@actual-app/core/shared/util';

import { compareToGoal, makeBalanceAmountStyle } from './util';

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
    expect(compareToGoal(10000, 10060)).toBe(-1);
    expect(makeBalanceAmountStyle(10000, 10040, 10000)).toEqual({
      color: theme.templateNumberFunded,
    });
  });

  it('compares whole units for currencies without decimals', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(compareToGoal(39950, 40049, 0)).toBe(-1);
    expect(compareToGoal(40049, 40049, 0)).toBe(0);
    expect(makeBalanceAmountStyle(39950, 40049, 39950, 0)).toEqual({
      color: theme.templateNumberUnderFunded,
    });
  });
});
