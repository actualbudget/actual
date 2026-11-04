import type { AccountBalanceConverter } from '#hooks/useAccountBalanceConverter';

import { buildBalanceHistory } from './balanceHistory';

const months = ['2026-08', '2026-09', '2026-10'];
const today = '2026-10-18';

// USD savings: worth 1.30 CAD until September and 1.40 CAD in October
const rates: Record<string, number> = {
  'usd@2026-08-31': 1.3,
  'usd@2026-09-30': 1.3,
  'usd@2026-10-18': 1.4,
};
const convertBalance: AccountBalanceConverter = (amount, account, date) => ({
  amount: Math.round(amount * (rates[`${account}@${date}`] ?? 1)),
  isApproximate: account === 'unrated',
});

describe('buildBalanceHistory', () => {
  it('carries balances through months without transactions', () => {
    const history = buildBalanceHistory({
      months,
      today,
      startingBalances: [{ account: 'cad', amount: 1000 }],
      monthlyAmounts: [{ account: 'cad', month: '2026-09', amount: 500 }],
    });

    expect(history.map(point => point.balance)).toEqual([1000, 1500, 1500]);
    expect(history.map(point => point.converted)).toEqual([1000, 1500, 1500]);
  });

  it('values the current month on today', () => {
    const history = buildBalanceHistory({
      months,
      today,
      startingBalances: [],
      monthlyAmounts: [],
    });

    expect(history.map(point => point.valuedOn)).toEqual([
      '2026-08-31',
      '2026-09-30',
      '2026-10-18',
    ]);
  });

  it('converts each account on the day its balance is valued', () => {
    const history = buildBalanceHistory({
      months,
      today,
      startingBalances: [
        { account: 'cad', amount: 1000 },
        { account: 'usd', amount: 100 },
      ],
      monthlyAmounts: [{ account: 'usd', month: '2026-10', amount: 100 }],
      convertBalance,
    });

    expect(history.map(point => point.balance)).toEqual([1100, 1100, 1200]);
    expect(history.map(point => point.converted)).toEqual([1130, 1130, 1280]);
    expect(history.some(point => point.isApproximate)).toBe(false);
  });

  it('marks points with an account converted approximately', () => {
    const history = buildBalanceHistory({
      months,
      today,
      startingBalances: [{ account: 'unrated', amount: 100 }],
      monthlyAmounts: [],
      convertBalance,
    });

    expect(history.map(point => point.isApproximate)).toEqual([
      true,
      true,
      true,
    ]);
  });
});
