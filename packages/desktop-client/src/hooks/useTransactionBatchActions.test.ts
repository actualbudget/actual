import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TransactionEntity } from '@actual-app/core/types/models';

import { useTransactionBatchActions } from './useTransactionBatchActions';

const { send, aqlQuery } = vi.hoisted(() => ({
  send: vi.fn<
    (name: string, changes: { added: TransactionEntity[] }) => Promise<void>
  >(),
  aqlQuery: vi.fn<() => Promise<{ data: TransactionEntity[] }>>(),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send,
}));
vi.mock('#queries/aqlQuery', () => ({ aqlQuery }));
vi.mock('#redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('#modals/modalsSlice', () => ({ pushModal: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: vi.fn() }) }));

function makeTransaction(
  overrides: Partial<TransactionEntity> = {},
): TransactionEntity {
  return {
    id: 'original',
    account: 'checking',
    date: '2026-10-01',
    amount: -3000,
    payee: 'shop',
    category: 'groceries',
    notes: 'Weekly shopping',
    cleared: true,
    reconciled: true,
    imported_id: 'bank-transaction',
    schedule: 'shopping-schedule',
    ...overrides,
  };
}

describe('onBatchDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a manual copy without the original import or schedule links', async () => {
    const original = makeTransaction();
    const snapshot = structuredClone(original);
    aqlQuery.mockResolvedValue({ data: [original] });
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useTransactionBatchActions());
    await result.current.onBatchDuplicate({ ids: [original.id], onSuccess });

    expect(send).toHaveBeenCalledExactlyOnceWith('transactions-batch-update', {
      added: [
        expect.objectContaining({
          account: 'checking',
          date: '2026-10-01',
          amount: -3000,
          payee: 'shop',
          category: 'groceries',
          notes: 'Weekly shopping',
          cleared: false,
          reconciled: false,
          imported_id: undefined,
          schedule: undefined,
        }),
      ],
    });
    const [, { added }] = send.mock.calls[0];
    expect(added[0].id).not.toBe(original.id);
    expect(original).toEqual(snapshot);
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith(['original']);
  });

  it('clears links on split children and reconnects them to the new parent', async () => {
    const original = makeTransaction({
      is_parent: true,
      payee: null,
      subtransactions: [
        makeTransaction({
          id: 'child-1',
          parent_id: 'original',
          is_child: true,
          amount: -1000,
          imported_id: 'child-bank-transaction',
          schedule: 'child-schedule',
        }),
        makeTransaction({
          id: 'child-2',
          parent_id: 'original',
          is_child: true,
          amount: -2000,
          category: 'household',
        }),
      ],
    });
    const snapshot = structuredClone(original);
    aqlQuery.mockResolvedValue({ data: [original] });

    const { result } = renderHook(() => useTransactionBatchActions());
    await result.current.onBatchDuplicate({ ids: [original.id] });

    const [, { added }] = send.mock.calls[0];
    expect(added).toHaveLength(3);
    const [parent, first, second] = added;
    for (const transaction of added) {
      expect(transaction).toMatchObject({
        imported_id: undefined,
        schedule: undefined,
        cleared: false,
        reconciled: false,
      });
      expect(['original', 'child-1', 'child-2']).not.toContain(transaction.id);
    }
    expect(new Set(added.map(transaction => transaction.id)).size).toBe(3);
    expect(parent).toMatchObject({ is_parent: true, amount: -3000 });
    expect(first).toMatchObject({
      parent_id: parent.id,
      is_child: true,
      amount: -1000,
      category: 'groceries',
    });
    expect(second).toMatchObject({
      parent_id: parent.id,
      is_child: true,
      amount: -2000,
      category: 'household',
    });
    expect(original).toEqual(snapshot);
  });
});
