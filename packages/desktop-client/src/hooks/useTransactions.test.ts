import type { TransactionEntity } from '@actual-app/core/types/models';
import { describe, expect, test } from 'vitest';

import { calculateRunningBalancesTopDown } from './useTransactions';

function transaction(
  id: string,
  amount: number,
  extra: Partial<TransactionEntity> = {},
): TransactionEntity {
  return {
    id,
    account: 'account',
    date: '2026-01-01',
    amount,
    reconciled: false,
    ...extra,
  };
}

// Transactions are listed newest first, matching the mobile account view.
const TRANSACTIONS = [
  transaction('newest', 1000),
  transaction('middle', -200),
  transaction('oldest', -250),
];

describe('calculateRunningBalancesTopDown', () => {
  test('the newest transaction starts from the starting balance', () => {
    const balances = calculateRunningBalancesTopDown(TRANSACTIONS, 'none', 500);

    expect(balances.get('newest')).toBe(500);
  });

  test('every other transaction is derived from the previous balance', () => {
    const balances = calculateRunningBalancesTopDown(TRANSACTIONS, 'none', 500);

    // middle: 500 - 1000
    expect(balances.get('middle')).toBe(-500);
    // oldest: -500 - (-200)
    expect(balances.get('oldest')).toBe(-300);
  });

  test('the last transaction is no longer set to its own amount', () => {
    const balances = calculateRunningBalancesTopDown(TRANSACTIONS, 'none', 500);

    // Regression test: the oldest entry used to be special-cased to its own
    // amount (-250), which is only correct for a fully loaded, unfiltered
    // account.
    expect(balances.get('oldest')).not.toBe(-250);
  });

  test('partially loaded lists keep balances consistent with the loaded rows', () => {
    // Same transactions, but the oldest one has not been loaded yet. The
    // visible entries keep the balances derived from their predecessors.
    const balances = calculateRunningBalancesTopDown(
      TRANSACTIONS.slice(0, 2),
      'none',
      500,
    );

    expect(balances.get('newest')).toBe(500);
    expect(balances.get('middle')).toBe(-500);
    expect(balances.has('oldest')).toBe(false);
  });

  test('skips child transactions of splits', () => {
    const transactions = [
      transaction('parent', 1000),
      transaction('child', -100, { parent_id: 'parent', is_child: true }),
      transaction('oldest', -250),
    ];

    const balances = calculateRunningBalancesTopDown(transactions, 'all', 500);

    expect(balances.has('child')).toBe(false);
    expect(balances.get('parent')).toBe(500);
    // -100 of the split child is ignored: 500 - 1000
    expect(balances.get('oldest')).toBe(-500);
  });

  test('a single transaction receives the starting balance', () => {
    const balances = calculateRunningBalancesTopDown(
      [transaction('only', 1234)],
      'none',
      4321,
    );

    expect(balances.get('only')).toBe(4321);
  });
});
