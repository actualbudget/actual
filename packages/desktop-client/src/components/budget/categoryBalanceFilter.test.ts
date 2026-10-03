import { matchesCategoryBalanceFilter } from './categoryBalanceFilter';

describe('matchesCategoryBalanceFilter', () => {
  it('matches every category when the filter is off', () => {
    expect(matchesCategoryBalanceFilter('all', [10])).toBe(true);
    expect(matchesCategoryBalanceFilter('all', [])).toBe(true);
    expect(matchesCategoryBalanceFilter('all', undefined)).toBe(true);
  });

  it('matches only positive balances as available', () => {
    expect(matchesCategoryBalanceFilter('available', [5000])).toBe(true);
    expect(matchesCategoryBalanceFilter('available', [0])).toBe(false);
    expect(matchesCategoryBalanceFilter('available', [-2000])).toBe(false);
  });

  it('matches only zero balances as no balance', () => {
    expect(matchesCategoryBalanceFilter('no-balance', [0])).toBe(true);
    expect(matchesCategoryBalanceFilter('no-balance', [5000])).toBe(false);
    expect(matchesCategoryBalanceFilter('no-balance', [-2000])).toBe(false);
  });

  it('matches only negative balances as overspent', () => {
    expect(matchesCategoryBalanceFilter('overspent', [-2000])).toBe(true);
    expect(matchesCategoryBalanceFilter('overspent', [0])).toBe(false);
    expect(matchesCategoryBalanceFilter('overspent', [5000])).toBe(false);
  });

  it('matches when any displayed month qualifies', () => {
    expect(matchesCategoryBalanceFilter('overspent', [0, -2000])).toBe(true);
    expect(matchesCategoryBalanceFilter('available', [-2000, 0, 100])).toBe(
      true,
    );
    expect(matchesCategoryBalanceFilter('no-balance', [100, 0])).toBe(true);
  });

  it('does not match a category with no balances', () => {
    expect(matchesCategoryBalanceFilter('available', [])).toBe(false);
    expect(matchesCategoryBalanceFilter('no-balance', [])).toBe(false);
    expect(matchesCategoryBalanceFilter('overspent', [])).toBe(false);
  });

  it('does not match a category whose balances have not loaded', () => {
    expect(matchesCategoryBalanceFilter('available', undefined)).toBe(false);
    expect(matchesCategoryBalanceFilter('no-balance', undefined)).toBe(false);
    expect(matchesCategoryBalanceFilter('overspent', undefined)).toBe(false);
  });
});
