import { aqlQuery } from '#queries/aqlQuery';

import { finishReconciliation } from './reconciliation';

vi.mock('#queries/aqlQuery', () => ({
  aqlQuery: vi.fn(),
}));

describe('finishReconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
