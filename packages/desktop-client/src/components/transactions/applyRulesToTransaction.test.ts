import { describe, expect, it } from 'vitest';

import type { TransactionEntity } from 'loot-core/types/models';

import { applyRulesToTransaction } from './applyRulesToTransaction';

const baseTransaction: TransactionEntity = {
  id: 'txn-1',
  account: 'account-1',
  amount: -1000,
  date: '2024-01-01',
  payee: 'amazon-payee-id',
};

describe('applyRulesToTransaction', () => {
  it('fills empty category when user changed a different field (payee)', () => {
    const transaction = { ...baseTransaction, category: undefined };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(transaction, afterRules, 'payee');

    expect(result.category).toBe('shopping-id');
  });

  it('does not re-apply rule category when user explicitly cleared the category', () => {
    // This is the bug: user set category to undefined/null intentionally,
    // but onApplyRules re-fills it because the value is falsy.
    const transaction = { ...baseTransaction, category: undefined };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(transaction, afterRules, 'category');

    expect(result.category).toBeUndefined();
  });

  it('does not override a non-empty category already chosen by the user', () => {
    const transaction = { ...baseTransaction, category: 'groceries-id' };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(transaction, afterRules, 'payee');

    expect(result.category).toBe('groceries-id');
  });

  it('fills other empty fields ruled by the matching payee when user changed payee', () => {
    const transaction = { ...baseTransaction, notes: '' };
    const afterRules = { ...transaction, notes: 'Amazon order' };

    const result = applyRulesToTransaction(transaction, afterRules, 'payee');

    expect(result.notes).toBe('Amazon order');
  });

  it('fills empty category when updatedFieldName is null (initial load)', () => {
    const transaction = { ...baseTransaction, category: undefined };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(transaction, afterRules, null);

    expect(result.category).toBe('shopping-id');
  });

  it('does not re-apply rule notes when user explicitly cleared notes', () => {
    const transaction = { ...baseTransaction, notes: '' };
    const afterRules = { ...transaction, notes: 'Amazon order' };

    const result = applyRulesToTransaction(transaction, afterRules, 'notes');

    expect(result.notes).toBe('');
  });

  describe('split transactions (is_parent + subtransactions)', () => {
    it('propagates updatedFieldName to subtransactions when user set a real value on the parent', () => {
      const transaction: TransactionEntity = {
        ...baseTransaction,
        is_parent: true,
        payee: 'amazon-payee-id',
        subtransactions: [
          {
            id: 'sub-1',
            account: 'account-1',
            amount: -600,
            date: '2024-01-01',
          },
          {
            id: 'sub-2',
            account: 'account-1',
            amount: -400,
            date: '2024-01-01',
          },
        ],
      };

      const afterRules: TransactionEntity = {
        ...transaction,
        subtransactions: [
          { ...transaction.subtransactions![0], payee: 'amazon-payee-id' },
          { ...transaction.subtransactions![1], payee: 'amazon-payee-id' },
        ],
      };

      const result = applyRulesToTransaction(transaction, afterRules, 'payee');

      expect(result.subtransactions?.[0].payee).toBe('amazon-payee-id');
      expect(result.subtransactions?.[1].payee).toBe('amazon-payee-id');
    });

    it('does not propagate rule category to subtransactions when user cleared category on parent', () => {
      // Regression: user clears category on parent split transaction;
      // the rule still has a category value on the subtransactions.
      // That value must NOT be written to children.
      const transaction: TransactionEntity = {
        ...baseTransaction,
        is_parent: true,
        category: undefined,
        subtransactions: [
          {
            id: 'sub-1',
            account: 'account-1',
            amount: -600,
            date: '2024-01-01',
          },
          {
            id: 'sub-2',
            account: 'account-1',
            amount: -400,
            date: '2024-01-01',
          },
        ],
      };

      const afterRules: TransactionEntity = {
        ...transaction,
        subtransactions: [
          { ...transaction.subtransactions![0], category: 'shopping-id' },
          { ...transaction.subtransactions![1], category: 'shopping-id' },
        ],
      };

      const result = applyRulesToTransaction(
        transaction,
        afterRules,
        'category',
      );

      expect(result.subtransactions?.[0].category).toBeUndefined();
      expect(result.subtransactions?.[1].category).toBeUndefined();
    });

    it('does not propagate rule notes to subtransactions when user cleared notes on parent', () => {
      const transaction: TransactionEntity = {
        ...baseTransaction,
        is_parent: true,
        notes: '',
        subtransactions: [
          {
            id: 'sub-1',
            account: 'account-1',
            amount: -600,
            date: '2024-01-01',
          },
          {
            id: 'sub-2',
            account: 'account-1',
            amount: -400,
            date: '2024-01-01',
          },
        ],
      };

      const afterRules: TransactionEntity = {
        ...transaction,
        subtransactions: [
          { ...transaction.subtransactions![0], notes: 'Amazon order' },
          { ...transaction.subtransactions![1], notes: 'Amazon order' },
        ],
      };

      const result = applyRulesToTransaction(transaction, afterRules, 'notes');

      expect(result.subtransactions?.[0].notes).toBeUndefined();
      expect(result.subtransactions?.[1].notes).toBeUndefined();
    });
  });
});
