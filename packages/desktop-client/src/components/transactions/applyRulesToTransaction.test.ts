import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  applyRulesToTransaction,
  transactionForRulesFromList,
} from './applyRulesToTransaction';
import { trackClearedField } from './table/utils';

const baseTransaction: TransactionEntity = {
  id: 'txn-1',
  account: 'account-1',
  amount: -1000,
  date: '2026-10-01',
  payee: 'amazon-payee-id',
};

function clearedFieldsOf(
  ...entries: Array<[TransactionEntity['id'], string[]]>
) {
  return new Map(entries.map(([id, fields]) => [id, new Set(fields)]));
}

describe('applyRulesToTransaction', () => {
  it('fills an empty category when the user edited a different field', () => {
    const transaction = { ...baseTransaction, category: undefined };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(transaction, afterRules, 'payee');

    expect(result.category).toBe('shopping-id');
  });

  it('keeps a field empty when the user explicitly cleared it on this row', () => {
    const transaction = { ...baseTransaction, category: undefined };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(
      transaction,
      afterRules,
      'category',
      clearedFieldsOf(['txn-1', ['category']]),
    );

    expect(result.category).toBeUndefined();
  });

  it('still fills a field that was cleared on a different row', () => {
    const transaction = { ...baseTransaction, category: undefined };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(
      transaction,
      afterRules,
      'amount',
      clearedFieldsOf(['some-other-txn', ['category']]),
    );

    expect(result.category).toBe('shopping-id');
  });

  it('does not override a non-empty value the user chose', () => {
    const transaction = { ...baseTransaction, category: 'groceries-id' };
    const afterRules = { ...transaction, category: 'shopping-id' };

    const result = applyRulesToTransaction(transaction, afterRules, 'payee');

    expect(result.category).toBe('groceries-id');
  });

  describe('split transactions', () => {
    function makeSplitTransaction(): TransactionEntity {
      return {
        ...baseTransaction,
        is_parent: true,
        category: undefined,
        subtransactions: [
          {
            id: 'sub-1',
            account: 'account-1',
            amount: -600,
            date: '2026-10-01',
          },
          {
            id: 'sub-2',
            account: 'account-1',
            amount: -400,
            date: '2026-10-01',
          },
        ],
      };
    }

    it('clearing a field on one split row does not block rules on its siblings', () => {
      const transaction = makeSplitTransaction();
      const afterRules: TransactionEntity = {
        ...transaction,
        subtransactions: [
          { ...transaction.subtransactions![0], category: 'shopping-id' },
          { ...transaction.subtransactions![1], category: 'shopping-id' },
        ],
      };

      // The user cleared the category on sub-1 only.
      const result = applyRulesToTransaction(
        transaction,
        afterRules,
        'category',
        clearedFieldsOf(['sub-1', ['category']]),
      );

      expect(result.subtransactions?.[0].category).toBeUndefined();
      expect(result.subtransactions?.[1].category).toBe('shopping-id');
    });

    it('propagates rule values to all split rows when nothing was cleared', () => {
      // The parent of a split never has a category itself; that must not be
      // mistaken for the user having cleared it.
      const transaction = makeSplitTransaction();
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

      expect(result.subtransactions?.[0].category).toBe('shopping-id');
      expect(result.subtransactions?.[1].category).toBe('shopping-id');
    });

    it('does not propagate to any split row when the field was cleared on the parent', () => {
      const transaction = { ...makeSplitTransaction(), notes: '' };
      const afterRules: TransactionEntity = {
        ...transaction,
        subtransactions: [
          { ...transaction.subtransactions![0], notes: 'Amazon order' },
          { ...transaction.subtransactions![1], notes: 'Amazon order' },
        ],
      };

      const result = applyRulesToTransaction(
        transaction,
        afterRules,
        'notes',
        clearedFieldsOf(['txn-1', ['notes']]),
      );

      expect(result.subtransactions?.[0].notes).toBeUndefined();
      expect(result.subtransactions?.[1].notes).toBeUndefined();
    });
  });
});

describe('transactionForRulesFromList', () => {
  it('returns a non-split transaction unchanged', () => {
    const transaction = { ...baseTransaction };
    expect(transactionForRulesFromList([transaction], transaction)).toEqual(
      transaction,
    );
  });

  it('groups a split parent with its children from a flat list', () => {
    const parent: TransactionEntity = {
      ...baseTransaction,
      is_parent: true,
      category: undefined,
    };
    const child1: TransactionEntity = {
      id: 'sub-1',
      account: 'account-1',
      amount: -600,
      date: '2026-10-01',
      is_child: true,
      parent_id: parent.id,
    };
    const child2: TransactionEntity = {
      id: 'sub-2',
      account: 'account-1',
      amount: -400,
      date: '2026-10-01',
      is_child: true,
      parent_id: parent.id,
    };

    const grouped = transactionForRulesFromList(
      [parent, child1, child2],
      parent,
    );

    expect(grouped.is_parent).toBe(true);
    expect(grouped.subtransactions).toEqual([child1, child2]);
    expect(grouped.id).toBe(parent.id);
  });

  it('groups by parent_id even if is_parent is missing on the row', () => {
    const parent: TransactionEntity = { ...baseTransaction };
    const child: TransactionEntity = {
      id: 'sub-1',
      account: 'account-1',
      amount: -1000,
      date: '2026-10-01',
      is_child: true,
      parent_id: parent.id,
    };

    const grouped = transactionForRulesFromList([parent, child], parent);

    expect(grouped.subtransactions).toEqual([child]);
  });
});

describe('trackClearedField', () => {
  it('marks a field cleared when its value is empty and unmarks it when set', () => {
    const clearedFields = new Map<TransactionEntity['id'], Set<string>>();

    trackClearedField(
      clearedFields,
      { ...baseTransaction, category: undefined },
      'category',
    );
    expect(clearedFields.get('txn-1')?.has('category')).toBe(true);

    trackClearedField(
      clearedFields,
      { ...baseTransaction, category: 'groceries-id' },
      'category',
    );
    expect(clearedFields.get('txn-1')?.has('category')).toBe(false);
  });

  it('tracks rows independently', () => {
    const clearedFields = new Map<TransactionEntity['id'], Set<string>>();

    trackClearedField(
      clearedFields,
      { ...baseTransaction, id: 'sub-1', category: undefined },
      'category',
    );

    expect(clearedFields.get('sub-1')?.has('category')).toBe(true);
    expect(clearedFields.get('sub-2')).toBeUndefined();
  });
});
