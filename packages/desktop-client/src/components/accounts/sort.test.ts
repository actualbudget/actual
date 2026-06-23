import { getTransactionSortExpressions, getTransactionSortField } from './sort';

describe('getTransactionSortField', () => {
  test('maps transaction table columns to query fields', () => {
    expect(getTransactionSortField()).toBe('date');
    expect(getTransactionSortField('account')).toBe('account.name');
    expect(getTransactionSortField('payee')).toBe('payee.name');
    expect(getTransactionSortField('category')).toBe('category.name');
    expect(getTransactionSortField('payment')).toBe('amount');
    expect(getTransactionSortField('deposit')).toBe('amount');
    expect(getTransactionSortField('notes')).toBe('notes');
  });
});

describe('getTransactionSortExpressions', () => {
  test('sorts transfer payees by their account names', () => {
    expect(getTransactionSortExpressions('payee', 'asc')).toEqual([
      { 'payee.name': 'asc' },
      { 'payee.transfer_acct.name': 'asc' },
    ]);
  });

  test('keeps the reconciled tiebreaker for cleared sorting', () => {
    expect(getTransactionSortExpressions('cleared', 'desc')).toEqual([
      { reconciled: 'desc' },
      { cleared: 'desc' },
    ]);
  });
});
