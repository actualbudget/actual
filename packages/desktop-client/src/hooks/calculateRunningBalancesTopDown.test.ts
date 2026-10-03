import type { TransactionEntity } from '@actual-app/core/types/models';

import { calculateRunningBalancesTopDown } from './useTransactions';

const row = (id: string, amount: number) =>
  ({
    id,
    amount,
    account: 'a',
    date: '2026-01-01',
  }) satisfies TransactionEntity;

it('continues the recurrence through the last loaded row', () => {
  // Newest first; the page does not reach the oldest transaction.
  const page = [row('c', 300), row('b', 200), row('a', 100)];
  const balances = calculateRunningBalancesTopDown(page, 'all', 1000);
  expect([...balances.values()]).toEqual([1000, 700, 500]);
});

it('gives visible rows their true balances when computed over hidden rows too', () => {
  // +100 unreconciled, +200 reconciled (hidden), +300 unreconciled.
  const full = [row('c', 300), row('b', 200), row('a', 100)];
  const balances = calculateRunningBalancesTopDown(full, 'all', 600);
  expect(balances.get('c')).toBe(600);
  expect(balances.get('a')).toBe(100);
});
