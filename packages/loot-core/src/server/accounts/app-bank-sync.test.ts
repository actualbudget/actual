import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';

import { app } from './app';
import * as bankSync from './sync';

vi.mock('./sync', async () => ({
  ...(await vi.importActual('./sync')),
  simpleFinBatchSync: vi.fn(),
  syncAccount: vi.fn(),
}));

const simpleFinBatchSyncHandler = app.handlers['simplefin-batch-sync'];

function insertBank(bank: { id: string; bank_id: string; name: string }) {
  db.runQuery(
    'INSERT INTO banks (id, bank_id, name, tombstone) VALUES (?, ?, ?, 0)',
    [bank.id, bank.bank_id, bank.name],
  );
}

async function setupSimpleFinAccounts(
  accounts: Array<{
    id: string;
    name: string;
    accountId: string;
  }>,
) {
  insertBank({ id: 'bank1', bank_id: 'sfin-bank', name: 'SimpleFin' });
  for (const acct of accounts) {
    await db.insertAccount({
      id: acct.id,
      name: acct.name,
      bank: 'bank1',
      account_id: acct.accountId,
      account_sync_source: 'simpleFin',
    });
  }
}

beforeEach(async () => {
  vi.resetAllMocks();
  await global.emptyDatabase()();
  await loadMappings();
});

describe('simpleFinBatchSync', () => {
  describe('when batch sync throws an error', () => {
    it('each account gets its own isolated errors array', async () => {
      await setupSimpleFinAccounts([
        { id: 'acct1', name: 'Checking', accountId: 'ext-1' },
        { id: 'acct2', name: 'Savings', accountId: 'ext-2' },
        { id: 'acct3', name: 'Credit Card', accountId: 'ext-3' },
      ]);

      vi.mocked(bankSync.simpleFinBatchSync).mockRejectedValue(
        new Error('connection timeout'),
      );

      const result = await simpleFinBatchSyncHandler({ ids: [] });

      expect(result).toHaveLength(3);

      // Each account must have its own errors array (not shared references)
      expect(result[0].res.errors).not.toBe(result[1].res.errors);
      expect(result[1].res.errors).not.toBe(result[2].res.errors);
      expect(result[0].res.errors).not.toBe(result[2].res.errors);

      // Each account must have exactly 1 error, not N errors
      expect(result[0].res.errors).toHaveLength(1);
      expect(result[1].res.errors).toHaveLength(1);
      expect(result[2].res.errors).toHaveLength(1);
    });

    it('each error references its own account', async () => {
      await setupSimpleFinAccounts([
        { id: 'acct1', name: 'Checking', accountId: 'ext-1' },
        { id: 'acct2', name: 'Savings', accountId: 'ext-2' },
      ]);

      vi.mocked(bankSync.simpleFinBatchSync).mockRejectedValue(
        new Error('server error'),
      );

      const result = await simpleFinBatchSyncHandler({ ids: [] });

      expect(result).toHaveLength(2);

      // Each error must reference only the account it belongs to
      expect(result[0].res.errors).toHaveLength(1);
      expect(result[0].res.errors[0].accountId).toBe('acct1');

      expect(result[1].res.errors).toHaveLength(1);
      expect(result[1].res.errors[0].accountId).toBe('acct2');
    });
  });

  describe('when individual accounts have errors in the response', () => {
    it('per-account error_code only affects that account', async () => {
      await setupSimpleFinAccounts([
        { id: 'acct1', name: 'Checking', accountId: 'ext-1' },
        { id: 'acct2', name: 'Savings', accountId: 'ext-2' },
      ]);

      vi.mocked(bankSync.simpleFinBatchSync).mockResolvedValue([
        {
          accountId: 'acct1',
          res: {
            error_code: 'ITEM_ERROR',
            error_type: 'Connection',
          },
        },
        {
          accountId: 'acct2',
          res: {
            added: [],
            updated: [],
          },
        },
      ]);

      const result = await simpleFinBatchSyncHandler({ ids: [] });

      expect(result).toHaveLength(2);

      // Account 1 should have an error
      const acct1Result = result.find(r => r.accountId === 'acct1');
      expect(acct1Result!.res.errors).toHaveLength(1);
      expect(acct1Result!.res.errors[0].accountId).toBe('acct1');

      // Account 2 should have no errors
      const acct2Result = result.find(r => r.accountId === 'acct2');
      expect(acct2Result!.res.errors).toHaveLength(0);
    });
  });
});
