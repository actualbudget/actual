import type { Query } from '@actual-app/core/shared/query';

import { finishReconciliation } from './reconciliation';

const currencies: Record<string, string | null> = { jpy: 'JPY', usd: null };

vi.mock('#queries/aqlQuery', () => ({
  aqlQuery: async (query: Query) => {
    const state = query.serialize();
    if (state.table === 'accounts') {
      const id = (state.filterExpressions[0] as { id: string }).id;
      return { data: [{ currency: currencies[id] }] };
    }
    // Cleared base sum -1000 (USD cents), native sum -1500 (yen).
    const sum = JSON.stringify(state.selectExpressions);
    return { data: sum.includes('transaction_amount') ? -1500 : -1000 };
  },
}));

it('compares a foreign account target with its native cleared balance', async () => {
  const lock = vi.fn(async () => undefined);
  await finishReconciliation('jpy', -1500, lock);
  expect(lock).toHaveBeenCalled();

  lock.mockClear();
  await finishReconciliation('jpy', -1000, lock);
  expect(lock).not.toHaveBeenCalled();
});

it('keeps base accounts on the base cleared balance', async () => {
  const lock = vi.fn(async () => undefined);
  await finishReconciliation('usd', -1000, lock);
  expect(lock).toHaveBeenCalled();
});
