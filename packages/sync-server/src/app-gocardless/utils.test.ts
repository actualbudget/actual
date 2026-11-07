import { describe, expect, it } from 'vitest';

import type { Transaction } from './gocardless-node.types';
import { startingBalanceFromTransactions, sumDecimalAmounts } from './utils';

describe('GoCardless decimal balance arithmetic', () => {
  it('keeps mixed precision and signed amounts without floating-point rounding', () => {
    const transactions = [
      { transactionAmount: { amount: '0.001', currency: 'KWD' } },
      { transactionAmount: { amount: '-0.002', currency: 'KWD' } },
      { transactionAmount: { amount: '0.10', currency: 'KWD' } },
    ] satisfies Transaction[];

    expect(startingBalanceFromTransactions('1.000', transactions)).toBe(
      '0.901',
    );
    expect(sumDecimalAmounts(['0.1', '0.2', '-0.3'])).toBe('0.0');
  });

  it('preserves source decimal precision for an empty batch', () => {
    expect(startingBalanceFromTransactions('1234.500', [])).toBe('1234.500');
  });

  it.each(['1e3', 'NaN', ' 1.0', '1.2.3', '1'.repeat(33)])(
    'rejects invalid decimal input %s',
    amount => {
      expect(() => sumDecimalAmounts([amount])).toThrow();
    },
  );

  it('rejects a result outside the wire limit', () => {
    expect(() => sumDecimalAmounts(['9'.repeat(32), '1'])).toThrow();
  });
});
