import * as asyncStorage from '#platform/server/asyncStorage';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { post } from '#server/post';
import { getServer } from '#server/server-config';

import { app } from './app';

// The sibling test hands the handler a ready-made `BankSyncError`, which only
// proves what the handler does with one. This file starts from the literal
// response body the sync server sends and runs the real download path, so the
// two ends of the contract are checked against each other rather than each
// against a fixture.

vi.mock('#server/post', () => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('#server/server-config', async () => ({
  ...(await vi.importActual('#server/server-config')),
  getServer: vi.fn(),
}));

const accountsBankSyncHandler = app.handlers['accounts-bank-sync'];

const goCardlessErrorResponse = (errorCode: string) => ({
  error_type: 'CONFIG_ERROR',
  error_code: errorCode,
  status: 'rejected',
  reason: 'GoCardless is not configured on the server.',
  rateLimitHeaders: {},
});

beforeEach(async () => {
  vi.resetAllMocks();
  vi.mocked(asyncStorage.multiGet).mockResolvedValue({
    'user-id': 'user-1',
    'user-key': 'key-1',
  });
  vi.mocked(asyncStorage.getItem).mockResolvedValue('token-1');
  vi.mocked(getServer).mockReturnValue({
    GOCARDLESS_SERVER: 'https://server.example/gocardless',
  } as ReturnType<typeof getServer>);

  await global.emptyDatabase()();
  await loadMappings();

  db.runQuery(
    'INSERT INTO banks (id, bank_id, name, tombstone) VALUES (?, ?, ?, 0)',
    ['bank1', 'gc-bank', 'GoCardless'],
  );
  await db.insertAccount({
    id: 'acct1',
    name: 'Checking',
    bank: 'bank1',
    account_id: 'ext-1',
    account_sync_source: 'goCardless',
  });
});

async function syncedAccountStatus() {
  const account = await db.first<db.DbAccount>(
    'SELECT * FROM accounts WHERE id = ?',
    ['acct1'],
  );
  return account?.bank_sync_status;
}

describe('GoCardless config errors from the sync server', () => {
  it('turns a GOCARDLESS_NOT_CONFIGURED response into a not-configured account', async () => {
    vi.mocked(post).mockResolvedValue(
      goCardlessErrorResponse('GOCARDLESS_NOT_CONFIGURED'),
    );

    const result = await accountsBankSyncHandler({ ids: ['acct1'] });

    expect(await syncedAccountStatus()).toBe('not-configured');
    expect(result.errors[0]).toMatchObject({
      category: 'CONFIG_ERROR',
      code: 'GOCARDLESS_NOT_CONFIGURED',
      // the point of the fix: the user is told what actually broke, rather
      // than being shown a generic internal error. The toast reaches admins
      // and non-admins alike, so it names the repair without telling the
      // reader to make it.
      message: expect.stringMatching(
        /secret ID and key have to be entered again/,
      ),
    });
  });

  it('turns a GOCARDLESS_INVALID_CREDENTIALS response into an invalid-credentials account', async () => {
    // Not 'not-configured': the two are both CONFIG_ERROR but mean different
    // things to the user, and the persisted status is all a reloaded client
    // has to tell them apart.
    vi.mocked(post).mockResolvedValue(
      goCardlessErrorResponse('GOCARDLESS_INVALID_CREDENTIALS'),
    );

    const result = await accountsBankSyncHandler({ ids: ['acct1'] });

    expect(await syncedAccountStatus()).toBe('invalid-credentials');
    expect(result.errors[0]).toMatchObject({
      category: 'CONFIG_ERROR',
      code: 'GOCARDLESS_INVALID_CREDENTIALS',
      message: expect.stringMatching(/rejected/i),
    });
  });
});
