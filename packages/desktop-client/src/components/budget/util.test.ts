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

  it('measures whole units for currencies without decimals', () => {
    setNumberFormat({ format: 'comma-dot', hideFraction: true });
    expect(getGoalDifference(39950, 40049, 0)).toBe(-99);
    expect(getGoalDifference(40049, 40049, 0)).toBe(0);
    expect(makeBalanceAmountStyle(39950, 40049, 39950, 0)).toEqual({
      color: theme.templateNumberUnderFunded,
    });
  });
});
