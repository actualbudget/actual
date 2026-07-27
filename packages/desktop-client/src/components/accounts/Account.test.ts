import type { TransactionEntity } from '@actual-app/core/types/models';

import { getSelectableTransactions } from './Account';

function makeTransaction(
  id: string,
  extra: Partial<TransactionEntity> = {},
): TransactionEntity {
  return {
    id,
    account: 'account-1',
    date: '2026-03-24',
    amount: -1000,
    ...extra,
  } as TransactionEntity;
}

const alwaysExpanded = () => true;
const neverExpanded = () => false;

describe('getSelectableTransactions', () => {
  test('keeps standalone transactions', () => {
    const transactions = [makeTransaction('tx-1'), makeTransaction('tx-2')];

    expect(
      getSelectableTransactions(transactions, true, alwaysExpanded).map(
        t => t.id,
      ),
    ).toEqual(['tx-1', 'tx-2']);
  });

  test('drops reconciled transactions when they are hidden', () => {
    const transactions = [
      makeTransaction('tx-1'),
      makeTransaction('tx-2', { reconciled: true }),
    ];

    expect(
      getSelectableTransactions(transactions, false, alwaysExpanded).map(
        t => t.id,
      ),
    ).toEqual(['tx-1']);

    expect(
      getSelectableTransactions(transactions, true, alwaysExpanded).map(
        t => t.id,
      ),
    ).toEqual(['tx-1', 'tx-2']);
  });

  test('drops split children while their parent is collapsed', () => {
    const transactions = [
      makeTransaction('parent-1', { is_parent: true }),
      makeTransaction('child-1', { parent_id: 'parent-1' }),
      makeTransaction('child-2', { parent_id: 'parent-1' }),
      makeTransaction('tx-9'),
    ];

    expect(
      getSelectableTransactions(transactions, true, neverExpanded).map(
        t => t.id,
      ),
    ).toEqual(['parent-1', 'tx-9']);
  });

  test('keeps split children once their parent is expanded', () => {
    const transactions = [
      makeTransaction('parent-1', { is_parent: true }),
      makeTransaction('child-1', { parent_id: 'parent-1' }),
      makeTransaction('tx-9'),
    ];

    expect(
      getSelectableTransactions(transactions, true, alwaysExpanded).map(
        t => t.id,
      ),
    ).toEqual(['parent-1', 'child-1', 'tx-9']);
  });

  test('expansion is resolved per parent', () => {
    const transactions = [
      makeTransaction('parent-1', { is_parent: true }),
      makeTransaction('child-1', { parent_id: 'parent-1' }),
      makeTransaction('parent-2', { is_parent: true }),
      makeTransaction('child-2', { parent_id: 'parent-2' }),
    ];

    expect(
      getSelectableTransactions(
        transactions,
        true,
        id => id === 'parent-2',
      ).map(t => t.id),
    ).toEqual(['parent-1', 'parent-2', 'child-2']);
  });
});
