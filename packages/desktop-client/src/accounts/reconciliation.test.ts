import type { Query } from '@actual-app/core/shared/query';

import { aqlQuery } from '#queries/aqlQuery';
import * as bindings from '#spreadsheet/bindings';

import { finishReconciliation } from './reconciliation';

vi.mock('#queries/aqlQuery', () => ({
  aqlQuery: vi.fn(),
}));

describe('finishReconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('checks the same cleared balance the reconcile bar shows', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 5000, dependencies: [] });

    await finishReconciliation('account-1', 5000, vi.fn());

    expect(aqlQuery).toHaveBeenCalledWith(
      bindings.accountBalanceCleared('account-1').query,
    );
  });

  test('locks and returns true when the entered balance matches the cleared balance', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 5000, dependencies: [] });
    const lock = vi.fn();

    const didReconcile = await finishReconciliation('account-1', 5000, lock);

    expect(lock).toHaveBeenCalledTimes(1);
    expect(didReconcile).toBe(true);
  });

  test('does not lock and returns false when the entered balance differs', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 5000, dependencies: [] });
    const lock = vi.fn();

    const didReconcile = await finishReconciliation('account-1', 4000, lock);

    expect(lock).not.toHaveBeenCalled();
    expect(didReconcile).toBe(false);
  });

  describe('with accounts in other currencies', () => {
    const currencies: Record<string, string | null> = {
      jpy: 'JPY',
      usd: null,
    };

    beforeEach(() => {
      vi.mocked(aqlQuery).mockImplementation(async (query: Query) => {
        const state = query.serialize();
        if (state.table === 'accounts') {
          const id = (state.filterExpressions[0] as { id: string }).id;
          return { data: [{ currency: currencies[id] }], dependencies: [] };
        }
        // Cleared base sum -1000 (USD cents), native sum -1500 (yen).
        const sum = JSON.stringify(state.selectExpressions);
        return {
          data: sum.includes('transaction_amount') ? -1500 : -1000,
          dependencies: [],
        };
      });
    });

    test('compares a foreign account target with its native cleared balance', async () => {
      const lock = vi.fn(async () => undefined);
      await finishReconciliation('jpy', -1500, lock);
      expect(lock).toHaveBeenCalled();

      lock.mockClear();
      await finishReconciliation('jpy', -1000, lock);
      expect(lock).not.toHaveBeenCalled();
    });

    test('keeps base accounts on the base cleared balance', async () => {
      const lock = vi.fn(async () => undefined);
      await finishReconciliation('usd', -1000, lock);
      expect(lock).toHaveBeenCalled();
    });
  });
});
