import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  applyRuleDiffToTransaction,
  shouldApplyRuleDiff,
} from './applyRuleDiff';

function transaction(overrides: Partial<TransactionEntity>): TransactionEntity {
  return {
    id: 'temp',
    account: 'account',
    amount: 0,
    cleared: false,
    date: '2026-01-01',
    payee: null,
    ...overrides,
  };
}

describe('applyRuleDiffToTransaction', () => {
  it('applies rule values to empty fields', () => {
    const result = applyRuleDiffToTransaction(
      transaction({ category: undefined }),
      {
        category: 'restaurants',
      },
    );

    expect(result.category).toBe('restaurants');
  });

  it('leaves empty fields unchanged when they are absent from the diff', () => {
    const result = applyRuleDiffToTransaction(transaction({ amount: 0 }), {
      category: 'restaurants',
    });

    expect(result.amount).toBe(0);
  });

  it('does not overwrite existing notes with set-style rule values', () => {
    const result = applyRuleDiffToTransaction(
      transaction({ notes: 'Coffee and cake' }),
      { notes: 'Rule note' },
    );

    expect(result.notes).toBe('Coffee and cake');
  });

  it('does not treat substring overlap as a notes merge', () => {
    const result = applyRuleDiffToTransaction(transaction({ notes: 'fee' }), {
      notes: 'coffee',
    });

    expect(result.notes).toBe('fee');
  });

  it('applies appended notes that preserve the existing user note', () => {
    const result = applyRuleDiffToTransaction(
      transaction({ notes: 'Coffee and cake' }),
      { notes: 'Coffee and cake Appended Text' },
    );

    expect(result.notes).toBe('Coffee and cake Appended Text');
  });

  it('applies prepended notes that preserve the existing user note', () => {
    const result = applyRuleDiffToTransaction(
      transaction({ notes: 'Coffee and cake' }),
      { notes: 'Prepended Text Coffee and cake' },
    );

    expect(result.notes).toBe('Prepended Text Coffee and cake');
  });

  it('allows non-empty fields to update after the payee changes', () => {
    const result = applyRuleDiffToTransaction(
      transaction({ notes: 'Existing note' }),
      { notes: 'Rule note' },
      'payee',
    );

    expect(result.notes).toBe('Rule note');
  });
});

describe('shouldApplyRuleDiff', () => {
  it('allows non-empty fields to update after the payee changes', () => {
    expect(
      shouldApplyRuleDiff(
        transaction({ notes: 'Existing note' }),
        'notes',
        'Rule note',
        'payee',
      ),
    ).toBe(true);
  });
});
