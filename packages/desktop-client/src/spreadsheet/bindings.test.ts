import { describe, expect, it } from 'vitest';

import {
  accountUnreconciledCount,
  last30DaysTransactionCount,
  pendingTransactionCount,
} from './bindings';

describe('sidebar spreadsheet bindings', () => {
  it('counts cleared-but-unreconciled transactions for one account', () => {
    const binding = accountUnreconciledCount('abc');
    const { filterExpressions, selectExpressions, calculation, table } =
      binding.query.serialize();
    expect(table).toBe('transactions');
    expect(filterExpressions).toEqual([
      { account: 'abc', cleared: true, reconciled: false },
    ]);
    expect(calculation).toBe(true);
    expect(selectExpressions).toEqual([{ result: { $count: '*' } }]);
  });

  it('counts uncleared transactions across open accounts', () => {
    const { filterExpressions, selectExpressions, table } =
      pendingTransactionCount().query.serialize();
    expect(table).toBe('transactions');
    expect(filterExpressions).toEqual([
      { 'account.closed': false, cleared: false },
    ]);
    expect(selectExpressions).toEqual([{ result: { $count: '*' } }]);
  });

  it('counts transactions from the last 30 days across open accounts', () => {
    const { filterExpressions, selectExpressions, table } =
      last30DaysTransactionCount().query.serialize();
    expect(table).toBe('transactions');
    expect(filterExpressions).toHaveLength(1);
    expect(filterExpressions[0]).toMatchObject({ 'account.closed': false });
    expect(filterExpressions[0].date).toHaveProperty('$gte');
    expect(selectExpressions).toEqual([{ result: { $count: '*' } }]);
  });

  it('gives every binding a stable, kebab-case runtime name', () => {
    expect(accountUnreconciledCount('abc').name).toBe('unreconciledCount-abc');
    expect(pendingTransactionCount().name).toBe('pending-transaction-count');
    expect(last30DaysTransactionCount().name).toBe(
      'last-30-days-transaction-count',
    );
  });
});
