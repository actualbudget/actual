import { createElement } from 'react';
import type { ReactNode } from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';
import { aqlQuery } from '#queries/aqlQuery';

import { useTransactionBatchActions } from './useTransactionBatchActions';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
vi.mock('#queries/aqlQuery', () => ({ aqlQuery: vi.fn() }));

const currencies: Record<string, string> = {
  chequing: 'CAD',
  savings: 'CAD',
  us: 'USD',
};

vi.mock('./useTransferAmountConverter', () => ({
  useIsCrossCurrencyTransfer:
    () => (accountId: string, otherAccountId: string) =>
      currencies[accountId] !== currencies[otherAccountId],
}));

function wrapper({ children }: { children: ReactNode }) {
  return createElement(TestProviders, null, children);
}

// Duplicates `original`, whose other side is `counterpart`, and returns
// what was sent to the server
async function duplicate(
  original: TransactionEntity,
  counterpart: Pick<TransactionEntity, 'id' | 'account' | 'amount'>,
) {
  const batchUpdate = vi.fn(async (_changes: unknown) => ({
    added: [],
    updated: [],
    deleted: [],
    errors: [] as string[],
  }));
  initServer({ 'transactions-batch-update': batchUpdate });
  vi.mocked(aqlQuery)
    .mockResolvedValueOnce({ data: [original], dependencies: [] })
    .mockResolvedValueOnce({ data: [counterpart], dependencies: [] });

  const { result } = renderHook(() => useTransactionBatchActions(), {
    wrapper,
  });
  await result.current.onBatchDuplicate({ ids: [original.id] });

  expect(batchUpdate).toHaveBeenCalledTimes(1);
  return batchUpdate.mock.calls[0][0] as {
    added: TransactionEntity[];
    transferAmounts: Record<string, number>;
  };
}

afterEach(() => {
  vi.mocked(aqlQuery).mockReset();
});

describe('onBatchDuplicate', () => {
  it('keeps what arrived on the other side of a transfer between currencies', async () => {
    const { added, transferAmounts } = await duplicate(
      {
        id: 'out',
        account: 'chequing',
        amount: -150000,
        date: '2026-03-15',
        payee: 'to-us',
        transfer_id: 'in',
      } as TransactionEntity,
      { id: 'in', account: 'us', amount: 100000 },
    );

    expect(added).toHaveLength(1);
    expect(added[0].id).not.toBe('out');
    expect(transferAmounts).toEqual({ [added[0].id]: 100000 });
  });

  it('enters nothing for a transfer within one currency', async () => {
    const { transferAmounts } = await duplicate(
      {
        id: 'out',
        account: 'chequing',
        amount: -150000,
        date: '2026-03-15',
        payee: 'to-savings',
        transfer_id: 'in',
      } as TransactionEntity,
      { id: 'in', account: 'savings', amount: 150000 },
    );

    expect(transferAmounts).toEqual({});
  });
});
