import type { TransactionEntity } from '@actual-app/core/types/models';
import { describe, expect, test } from 'vitest';

import {
  calculateRunningBalancesBottomUp,
  calculateRunningBalancesTopDown,
} from './useTransactions';

function makeTransaction(
  id: string,
  amount: number,
  overrides: Partial<TransactionEntity> = {},
): TransactionEntity {
  return {
    id,
    account: 'checking',
    date: '2026-09-01',
    amount,
    ...overrides,
  } as TransactionEntity;
}

// Newest first, the order the account views query in.
const newest = makeTransaction('newest', -2500);
const middle = makeTransaction('middle', 10000);
const oldest = makeTransaction('oldest', -1000);
const accountBalance = 178598;

describe('calculateRunningBalancesTopDown', () => {
  test('walks down from the starting balance', () => {
    const balances = calculateRunningBalancesTopDown(
      [newest, middle, oldest],
      'all',
      accountBalance,
    );

    expect(balances.get(newest.id)).toBe(accountBalance);
    expect(balances.get(middle.id)).toBe(accountBalance + 2500);
    expect(balances.get(oldest.id)).toBe(accountBalance + 2500 - 10000);
  });

  test("does not assume the last transaction is the account's first", () => {
    // Before every page has loaded, the list ends short of the account's
    // first transaction. The last loaded transaction must carry the balance
    // after it, not its own amount (#9040).
    const balances = calculateRunningBalancesTopDown(
      [newest, oldest],
      'all',
      accountBalance,
    );

    expect(balances.get(oldest.id)).toBe(accountBalance + 2500);
    expect(balances.get(oldest.id)).not.toBe(oldest.amount);
  });

  test('a single transaction carries the starting balance', () => {
    const balances = calculateRunningBalancesTopDown(
      [newest],
      'all',
      accountBalance,
    );

    expect(balances.get(newest.id)).toBe(accountBalance);
  });

  test('skips split children when splits are expanded', () => {
    const child = makeTransaction('child', -500, {
      parent_id: newest.id,
      is_child: true,
    });
    const balances = calculateRunningBalancesTopDown(
      [newest, child, oldest],
      'all',
      accountBalance,
    );

    expect(balances.has(child.id)).toBe(false);
    expect(balances.get(oldest.id)).toBe(accountBalance + 2500);
  });
});

describe('calculateRunningBalancesBottomUp', () => {
  test('walks up from the starting balance', () => {
    const balances = calculateRunningBalancesBottomUp(
      [newest, middle, oldest],
      'all',
      0,
    );

    expect(balances.get(oldest.id)).toBe(-1000);
    expect(balances.get(middle.id)).toBe(9000);
    expect(balances.get(newest.id)).toBe(6500);
  });
});
