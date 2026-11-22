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

  test('locks when the entered balance matches the cleared balance', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 5000, dependencies: [] });
    const lock = vi.fn();

    await finishReconciliation('account-1', 5000, lock);

    expect(lock).toHaveBeenCalledTimes(1);
  });

  test('does not lock when the entered balance differs', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 5000, dependencies: [] });
    const lock = vi.fn();

    await finishReconciliation('account-1', 4000, lock);

    expect(lock).not.toHaveBeenCalled();
  });
});
