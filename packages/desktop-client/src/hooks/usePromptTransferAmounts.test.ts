import type { TransactionEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { findTransfersNeedingAmount } from './usePromptTransferAmounts';

const currencies: Record<string, string> = {
  chequing: 'CAD',
  savings: 'CAD',
  us: 'USD',
  'us-savings': 'USD',
};
const transferAccounts: Record<string, string> = {
  'to-chequing': 'chequing',
  'to-savings': 'savings',
  'to-us': 'us',
  'to-us-savings': 'us-savings',
};

function transaction(
  fields: Partial<TransactionEntity> = {},
): TransactionEntity {
  return {
    id: 'out',
    account: 'chequing',
    amount: -150000,
    date: '2026-03-15',
    payee: 'to-us',
    ...fields,
  } as TransactionEntity;
}

function find(
  transactions: TransactionEntity[],
  previous: TransactionEntity[] = [],
) {
  return findTransfersNeedingAmount({
    transactions,
    previousById: new Map(previous.map(t => [t.id, t])),
    getTransferAccountId: payeeId =>
      (payeeId && transferAccounts[payeeId]) || null,
    getAccountCurrency: accountId => currencies[accountId] ?? null,
  });
}

describe('findTransfersNeedingAmount', () => {
  it('asks for a new transfer to another currency', () => {
    expect(find([transaction()])).toEqual([
      {
        id: 'out',
        accountId: 'chequing',
        transferAccountId: 'us',
        amount: -150000,
        date: '2026-03-15',
      },
    ]);
  });

  it('asks when an existing transaction becomes such a transfer', () => {
    expect(
      find([transaction()], [transaction({ payee: 'grocer' })]),
    ).toHaveLength(1);
  });

  it.each([
    ['within one currency', transaction({ payee: 'to-savings' })],
    ['to a payee', transaction({ payee: 'grocer' })],
    ['without an amount', transaction({ amount: 0 })],
    ['for a split parent', transaction({ is_parent: true })],
    ['to its own account', transaction({ account: 'us' })],
  ])('skips a transaction %s', (_, candidate) => {
    expect(find([candidate])).toEqual([]);
  });

  it('skips an edit that keeps the transfer, so the other side stays', () => {
    expect(find([transaction({ amount: -160000 })], [transaction()])).toEqual(
      [],
    );
  });

  it('skips a transfer moved to another account in the same currency', () => {
    expect(
      find([transaction({ payee: 'to-us-savings' })], [transaction()]),
    ).toEqual([]);
  });

  it('asks when a transfer moves to another currency', () => {
    expect(
      find([transaction()], [transaction({ payee: 'to-savings' })]),
    ).toHaveLength(1);
  });
});
