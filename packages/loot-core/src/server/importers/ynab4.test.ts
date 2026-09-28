import { beforeEach, describe, expect, it, vi } from 'vitest';

import { send } from '#server/main-app';
import { makeChild } from '#shared/transactions';

import { importTransactions } from './ynab4';
import type * as YNAB4 from './ynab4-types';

vi.mock('#server/main-app', () => ({
  send: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(send).mockReset();
});

describe('importTransactions', () => {
  it('gives non-transfer split children the parent payee and keeps transfer children on the transfer payee', async () => {
    const entityIdMap = new Map<string, string>([
      ['ynab-account-1', 'actual-account-1'],
      ['ynab-account-2', 'actual-account-2'],
      ['ynab-payee-1', 'actual-payee-1'],
      ['ynab-category-1', 'actual-category-1'],
    ]);

    // Shaped like a real YNAB4 export: the payee lives on the parent only,
    // sub transactions carry no payeeId.
    const split = {
      entityId: 'txn-split',
      accountId: 'ynab-account-1',
      payeeId: 'ynab-payee-1',
      categoryId: 'Category/__Split__',
      amount: -1000,
      date: '2024-10-07',
      cleared: 'Uncleared',
      subTransactions: [
        {
          entityId: 'sub-1',
          amount: -50,
          categoryId: 'ynab-category-1',
        },
        {
          entityId: 'sub-2',
          amount: -950,
          categoryId: null,
          targetAccountId: 'ynab-account-2',
          transferTransactionId: 'txn-transfer-in',
        },
      ],
    };
    const transferIn = {
      entityId: 'txn-transfer-in',
      accountId: 'ynab-account-2',
      amount: 950,
      date: '2024-10-07',
      cleared: 'Uncleared',
      targetAccountId: 'ynab-account-1',
      transferTransactionId: 'sub-2',
    };

    vi.mocked(send).mockImplementation(async (name: string) => {
      switch (name) {
        case 'api/categories-get':
          return [{ id: 'income-id', name: 'Income' }];
        case 'api/accounts-get':
          return [
            { id: 'actual-account-1', offbudget: false },
            { id: 'actual-account-2', offbudget: false },
          ];
        case 'api/payees-get':
          return [
            { id: 'transfer-payee-1', transfer_acct: 'actual-account-1' },
            { id: 'transfer-payee-2', transfer_acct: 'actual-account-2' },
          ];
        case 'api/transactions-add':
          return null;
        default:
          throw new Error(`Unexpected send call: ${name}`);
      }
    });

    await importTransactions(
      {
        payees: [{ entityId: 'ynab-payee-1', name: 'Some Payee' }],
        accounts: [],
        transactions: [split, transferIn],
      } as unknown as YNAB4.YFull,
      entityIdMap,
      vi.fn(),
    );

    const imported = vi
      .mocked(send)
      .mock.calls.filter(([name]) => name === 'api/transactions-add')
      .flatMap(([, args]) => args.transactions);
    const parent = imported.find(t => t.id === entityIdMap.get('txn-split'));

    expect(parent.payee).toBe('actual-payee-1');
    expect(parent.imported_payee).toBe('Some Payee');

    const [child, transferChild] = parent.subtransactions;
    // No payee key at all, so makeChild falls back to the parent payee
    expect(child).not.toHaveProperty('payee');
    expect(child.transfer_id).toBeNull();
    expect(makeChild(parent, child).payee).toBe('actual-payee-1');

    expect(transferChild.payee).toBe('transfer-payee-2');
    expect(transferChild.transfer_id).toBe(entityIdMap.get('txn-transfer-in'));
  });
});
