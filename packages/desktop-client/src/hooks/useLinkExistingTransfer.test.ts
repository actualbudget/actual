import type {
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import {
  getLinkCandidates,
  pickTransferMatch,
} from './useLinkExistingTransfer';

const saved = {
  id: 'a',
  account: 'checking',
  amount: -50000,
  date: '2026-11-10',
  payee: 'p-savings',
  transfer_id: undefined,
} satisfies TransactionEntity;

const payees = [
  { id: 'p-savings', name: '', transfer_acct: 'savings' },
  { id: 'p-checking', name: '', transfer_acct: 'checking' },
  { id: 'p-store', name: 'Store' },
] satisfies PayeeEntity[];

function candidate(
  overrides: Partial<TransactionEntity> & { id: string },
): TransactionEntity {
  return {
    account: 'savings',
    amount: 50000,
    date: '2026-11-12',
    ...overrides,
  };
}

describe('pickTransferMatch', () => {
  it('picks the only candidate', () => {
    const match = candidate({ id: 'b' });
    expect(pickTransferMatch(saved, [match])).toBe(match);
  });

  it('prefers the closest date, then the earlier date', () => {
    expect(
      pickTransferMatch(saved, [
        candidate({ id: 'b', date: '2026-11-13' }),
        candidate({ id: 'c', date: '2026-11-07' }),
        candidate({ id: 'd', date: '2026-11-12' }),
      ])?.date,
    ).toBe('2026-11-12');

    expect(
      pickTransferMatch(saved, [
        candidate({ id: 'b', date: '2026-11-11' }),
        candidate({ id: 'c', date: '2026-11-09' }),
      ])?.date,
    ).toBe('2026-11-09');
  });
});

describe('getLinkCandidates', () => {
  it('leaves the diff alone when the payee did not change', () => {
    expect(
      getLinkCandidates(
        { added: [], updated: [{ id: 'a', amount: -60000 }], deleted: [] },
        [{ ...saved, amount: -60000 }],
        payees,
      ),
    ).toEqual([]);
  });

  it('finds the changed payee of an existing transaction', () => {
    expect(
      getLinkCandidates(
        { added: [], updated: [{ id: 'a', payee: 'p-savings' }], deleted: [] },
        [saved],
        payees,
      ),
    ).toEqual([saved]);
  });

  it('finds the transfer child of a new split', () => {
    const parent = {
      ...saved,
      id: 'parent',
      payee: 'p-store',
      amount: -80000,
      is_parent: true,
    };
    const transferChild = {
      ...saved,
      id: 'child-1',
      is_child: true,
      parent_id: 'parent',
    };
    const otherChild = {
      ...saved,
      id: 'child-2',
      payee: 'p-store',
      amount: -30000,
      is_child: true,
      parent_id: 'parent',
    };
    const added = [parent, transferChild, otherChild];

    expect(
      getLinkCandidates({ added, updated: [], deleted: [] }, added, payees),
    ).toEqual([transferChild]);
  });

  it('skips rows that are already linked or are split parents', () => {
    const second = { ...saved, id: 'b' };
    const linked = { ...saved, id: 'c', transfer_id: 'z' };
    const parent = { ...saved, id: 'd', is_parent: true };
    expect(
      getLinkCandidates(
        { added: [saved, second, linked, parent], updated: [], deleted: [] },
        [saved, second, linked, parent],
        payees,
      ),
    ).toEqual([saved, second]);
  });
});
