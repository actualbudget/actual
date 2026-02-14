import { describe, expect, test } from 'vitest';

import type { TransactionEntity } from 'loot-core/types/models';

import { deserializeTransaction, serializeTransaction } from './utils';

function makeTransaction(amount: number): TransactionEntity {
  return {
    id: 'tx-1',
    account: 'acct-1',
    amount,
    date: '2026-02-08',
  };
}

describe('transaction table utils decimal places', () => {
  test('serializes and deserializes zero-decimal currencies', () => {
    const original = makeTransaction(1000000);

    const serialized = serializeTransaction(original, false, 0);
    expect(serialized.credit).toBe('1,000,000');
    expect(serialized.debit).toBe('');

    const deserialized = deserializeTransaction(serialized, original, 0);
    expect(deserialized.amount).toBe(1000000);
  });

  test('serializes and deserializes three-decimal currencies', () => {
    const original = makeTransaction(1000000);

    const serialized = serializeTransaction(original, false, 3);
    expect(serialized.credit).toBe('1,000.000');
    expect(serialized.debit).toBe('');

    const deserialized = deserializeTransaction(serialized, original, 3);
    expect(deserialized.amount).toBe(1000000);
  });

  test('keeps two-decimal behavior by default', () => {
    const original = makeTransaction(1000000);

    const serialized = serializeTransaction(original, false);
    expect(serialized.credit).toBe('10,000.00');
    expect(serialized.debit).toBe('');

    const deserialized = deserializeTransaction(serialized, original);
    expect(deserialized.amount).toBe(1000000);
  });
});
