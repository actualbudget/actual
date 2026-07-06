import { beforeEach, describe, expect, it, vi } from 'vitest';

import { send } from '#server/main-app';

import { getBudgetName, importPayees, parseFile } from './ynab5';
import type { Payee } from './ynab5-types';

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
