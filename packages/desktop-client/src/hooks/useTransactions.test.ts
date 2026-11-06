import type { TransactionEntity } from '@actual-app/core/types/models';

import { calculateRunningBalancesTopDown } from './useTransactions';

function tx(id: string, amount: number, parent_id?: string) {
  return { id, amount, parent_id } as TransactionEntity;
}

describe('calculateRunningBalancesTopDown', () => {
  it('full history: last balance equals its own amount', () => {
    const balances = calculateRunningBalancesTopDown(
      [tx('a', 100), tx('b', -50), tx('c', 200)],
      'none',
      250,
    );

    expect(Object.fromEntries(balances)).toEqual({ a: 250, b: 150, c: 200 });
  });

  it('does not reset the last balance to its amount when older transactions are not in the list', () => {
    // An older transaction (e.g. reconciled and hidden) contributes 1000.
    const balances = calculateRunningBalancesTopDown(
      [tx('a', 100), tx('b', -10)],
      'none',
      1090,
    );

    expect(Object.fromEntries(balances)).toEqual({ a: 1090, b: 990 });
  });

  it('skips split children when splits is "all"', () => {
    const balances = calculateRunningBalancesTopDown(
      [tx('p', -30), tx('c1', -10, 'p'), tx('c2', -20, 'p'), tx('o', 100)],
      'all',
      70,
    );

    expect(Object.fromEntries(balances)).toEqual({ p: 70, o: 100 });
  });
});
