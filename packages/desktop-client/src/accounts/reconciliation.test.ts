import { send } from '@actual-app/core/platform/client/connection';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { aqlQuery } from '#queries/aqlQuery';
import * as bindings from '#spreadsheet/bindings';

import {
  createReconciliationTransaction,
  finishReconciliation,
} from './reconciliation';

vi.mock('#queries/aqlQuery', () => ({
  aqlQuery: vi.fn(),
}));

vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
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
});

describe('createReconciliationTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Rules leave the transaction unchanged; saving returns nothing
    vi.mocked(send).mockImplementation(async (name: string, args?: unknown) =>
      name === 'rules-run'
        ? (args as { transaction: TransactionEntity }).transaction
        : undefined,
    );
  });

  function savedBatches() {
    return vi
      .mocked(send)
      .mock.calls.filter(([name]) => name === 'transactions-batch-update')
      .map(([, batch]) => batch as { added: TransactionEntity[] });
  }

  test('adds a cleared transaction for the difference to the bank balance', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 3000, dependencies: [] });

    await createReconciliationTransaction('account-1', 10000);

    const batches = savedBatches();
    expect(batches).toHaveLength(1);
    expect(batches[0].added).toHaveLength(1);
    expect(batches[0].added[0]).toMatchObject({
      account: 'account-1',
      amount: 7000,
      cleared: true,
    });
  });

  test('adds nothing when the cleared balance already matches', async () => {
    vi.mocked(aqlQuery).mockResolvedValue({ data: 10000, dependencies: [] });
    const onRealized = vi.fn();

    await createReconciliationTransaction('account-1', 10000, onRealized);

    expect(send).not.toHaveBeenCalled();
    expect(onRealized).not.toHaveBeenCalled();
  });

  test('adds only one adjustment when called again after the first is saved', async () => {
    vi.mocked(aqlQuery)
      .mockResolvedValueOnce({ data: 3000, dependencies: [] })
      // The first adjustment is now part of the cleared balance
      .mockResolvedValueOnce({ data: 10000, dependencies: [] });

    await createReconciliationTransaction('account-1', 10000);
    await createReconciliationTransaction('account-1', 10000);

    expect(savedBatches()).toHaveLength(1);
  });
});
