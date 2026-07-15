import { beforeEach, describe, expect, it, vi } from 'vitest';

import { send } from '#server/main-app';

import {
  getBudgetName,
  importPayees,
  importTransactions,
  parseFile,
} from './ynab5';
import type { Payee, Transaction } from './ynab5-types';

vi.mock('#server/main-app', () => ({
  send: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(send).mockReset();
});

function toBuffer(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj));
}

function makePayee(overrides: Partial<Payee> = {}): Payee {
  return {
    id: 'payee-1',
    name: 'Some Payee',
    deleted: false,
    ...overrides,
  };
}

describe('importPayees', () => {
  it('does not create an Actual payee for a YNAB transfer-linked payee', async () => {
    vi.mocked(send).mockResolvedValue('created-payee-id');

    const transferPayee = makePayee({
      id: 'ynab-transfer-payee',
      name: 'Transfer : Savings',
      transfer_account_id: 'ynab-account-2',
    });
    const normalPayee = makePayee({
      id: 'ynab-normal-payee',
      name: 'Coffee Shop',
    });

    const entityIdMap = new Map<string, string>();
    await importPayees(
      { payees: [transferPayee, normalPayee] } as Parameters<
        typeof importPayees
      >[0],
      entityIdMap,
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('api/payee-create', {
      payee: { name: 'Coffee Shop' },
    });
    expect(entityIdMap.has('ynab-transfer-payee')).toBe(false);
    expect(entityIdMap.get('ynab-normal-payee')).toBe('created-payee-id');
  });

  it('still skips deleted payees', async () => {
    vi.mocked(send).mockResolvedValue('created-payee-id');

    const deletedPayee = makePayee({ id: 'deleted-1', deleted: true });
    const entityIdMap = new Map<string, string>();

    await importPayees(
      { payees: [deletedPayee] } as Parameters<typeof importPayees>[0],
      entityIdMap,
    );

    expect(send).not.toHaveBeenCalled();
    expect(entityIdMap.size).toBe(0);
  });
});

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    date: '2026-01-01',
    amount: -10000,
    cleared: 'cleared',
    approved: true,
    account_id: 'ynab-account-1',
    deleted: false,
    ...overrides,
  };
}

describe('importTransactions', () => {
  it('resolves a transfer transaction to the account-transfer payee', async () => {
    const entityIdMap = new Map<string, string>([
      ['ynab-account-1', 'actual-account-1'],
      ['ynab-account-2', 'actual-account-2'],
    ]);

    const transactionOut = makeTransaction({
      id: 'txn-out',
      account_id: 'ynab-account-1',
      amount: -10000,
      transfer_account_id: 'ynab-account-2',
      transfer_transaction_id: 'txn-in',
      payee_id: 'ynab-transfer-payee',
    });
    const transactionIn = makeTransaction({
      id: 'txn-in',
      account_id: 'ynab-account-2',
      amount: 10000,
      transfer_account_id: 'ynab-account-1',
      transfer_transaction_id: 'txn-out',
      payee_id: 'ynab-transfer-payee',
    });

    vi.mocked(send).mockImplementation(async (name: string) => {
      if (name === 'api/payees-get') {
        return [
          {
            id: 'actual-payee-for-account-1',
            transfer_acct: 'actual-account-1',
          },
          {
            id: 'actual-payee-for-account-2',
            transfer_acct: 'actual-account-2',
          },
        ];
      }
      if (name === 'api/categories-get') {
        return [];
      }
      if (name === 'api/transactions-add') {
        return null;
      }
      throw new Error(`Unexpected send call: ${name}`);
    });

    await importTransactions(
      {
        payees: [],
        transactions: [transactionOut, transactionIn],
        subtransactions: [],
      } as unknown as Parameters<typeof importTransactions>[0],
      entityIdMap,
      new Set(),
    );

    const transactionsAddCalls = vi
      .mocked(send)
      .mock.calls.filter(([name]) => name === 'api/transactions-add');
    expect(transactionsAddCalls).toHaveLength(2);

    const allImportedTransactions = transactionsAddCalls.flatMap(
      ([, args]) => args.transactions,
    );
    const outImported = allImportedTransactions.find(
      t => t.id === entityIdMap.get('txn-out'),
    );
    const inImported = allImportedTransactions.find(
      t => t.id === entityIdMap.get('txn-in'),
    );

    expect(outImported.payee).toBe('actual-payee-for-account-2');
    expect(inImported.payee).toBe('actual-payee-for-account-1');

    expect(outImported.transfer_id).toBe(inImported.id);
    expect(inImported.transfer_id).toBe(outImported.id);
  });
});

describe('ynab5 parseFile', () => {
  it('unwraps the legacy `budget` wrapper', () => {
    const data = parseFile(
      toBuffer({ data: { budget: { name: 'Legacy', accounts: [] } } }),
    );

    expect(data.name).toBe('Legacy');
    expect(getBudgetName('legacy.json', data)).toBe('Legacy');
  });

  it('unwraps the renamed `plan` wrapper from the current YNAB API', () => {
    const data = parseFile(
      toBuffer({ data: { plan: { name: 'Modern', accounts: [] } } }),
    );

    expect(data.name).toBe('Modern');
    expect(getBudgetName('modern.json', data)).toBe('Modern');
  });

  it('returns an already-unwrapped object unchanged', () => {
    const data = parseFile(toBuffer({ name: 'Bare', accounts: [] }));

    expect(data.name).toBe('Bare');
  });
});
