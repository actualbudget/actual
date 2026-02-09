// @ts-strict-ignore
import * as asyncStorage from '../../platform/server/asyncStorage';
import * as db from '../db';
import { loadMappings } from '../db/mappings';
import * as postModule from '../post';
import { loadRules } from '../transactions/transaction-rules';

import { syncAccount } from './sync';

beforeEach(async () => {
  vi.resetAllMocks();
  await global.emptyDatabase()();
  await loadMappings();
  await loadRules();
});

describe('bunq sync cursor integration', () => {
  test('persists and reuses bunq cursor across sync runs', async () => {
    const accountId = 'bunq-local-account';
    const remoteAccountId = 'bunq-remote-account';

    await db.insertAccount({
      id: accountId,
      account_id: remoteAccountId,
      name: 'bunq account',
      balance_current: 0,
      account_sync_source: 'bunq',
    });

    await db.insertPayee({
      id: `transfer-${accountId}`,
      name: '',
      transfer_acct: accountId,
    });

    vi.spyOn(asyncStorage, 'getItem').mockResolvedValue('user-token');

    const postSpy = vi
      .spyOn(postModule, 'post')
      .mockResolvedValueOnce({
        transactions: { all: [], booked: [], pending: [] },
        balances: [],
        startingBalance: 1000,
        cursor: { newerId: '55' },
      })
      .mockResolvedValueOnce({
        transactions: { all: [], booked: [], pending: [] },
        balances: [],
        startingBalance: 1000,
        cursor: { newerId: '55' },
      });

    await syncAccount(undefined, undefined, accountId, remoteAccountId, '');

    const savedCursor = await db.select(
      'preferences',
      `bunq-sync-cursor-${accountId}-${remoteAccountId}`,
    );
    expect(savedCursor.value).toBe('{"newerId":"55"}');

    await syncAccount(undefined, undefined, accountId, remoteAccountId, '');

    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        accountId: remoteAccountId,
        cursor: { newerId: '55' },
      }),
      expect.any(Object),
      60000,
    );
  });

  test('does not reuse cursor from previously linked bunq subaccount on same local account', async () => {
    const accountId = 'bunq-local-account';
    const firstRemoteAccountId = 'bunq-remote-account-1';
    const secondRemoteAccountId = 'bunq-remote-account-2';

    await db.insertAccount({
      id: accountId,
      account_id: firstRemoteAccountId,
      name: 'bunq account',
      balance_current: 0,
      account_sync_source: 'bunq',
    });

    await db.insertPayee({
      id: `transfer-${accountId}`,
      name: '',
      transfer_acct: accountId,
    });

    vi.spyOn(asyncStorage, 'getItem').mockResolvedValue('user-token');

    const postSpy = vi
      .spyOn(postModule, 'post')
      .mockResolvedValueOnce({
        transactions: { all: [], booked: [], pending: [] },
        balances: [],
        startingBalance: 1000,
        cursor: { newerId: '55' },
      })
      .mockResolvedValueOnce({
        transactions: { all: [], booked: [], pending: [] },
        balances: [],
        startingBalance: 1000,
        cursor: { newerId: '99' },
      });

    await syncAccount(
      undefined,
      undefined,
      accountId,
      firstRemoteAccountId,
      '',
    );
    await db.update('accounts', {
      id: accountId,
      account_id: secondRemoteAccountId,
    });
    await syncAccount(
      undefined,
      undefined,
      accountId,
      secondRemoteAccountId,
      '',
    );

    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        accountId: secondRemoteAccountId,
        cursor: null,
      }),
      expect.any(Object),
      60000,
    );

    const firstCursor = await db.select(
      'preferences',
      `bunq-sync-cursor-${accountId}-${firstRemoteAccountId}`,
    );
    const secondCursor = await db.select(
      'preferences',
      `bunq-sync-cursor-${accountId}-${secondRemoteAccountId}`,
    );

    expect(firstCursor.value).toBe('{"newerId":"55"}');
    expect(secondCursor.value).toBe('{"newerId":"99"}');
  });

  test('forwards importCategory preference to bunq transactions request', async () => {
    const accountId = 'bunq-local-account';
    const remoteAccountId = 'bunq-remote-account';

    await db.insertAccount({
      id: accountId,
      account_id: remoteAccountId,
      name: 'bunq account',
      balance_current: 0,
      account_sync_source: 'bunq',
    });

    await db.insertPayee({
      id: `transfer-${accountId}`,
      name: '',
      transfer_acct: accountId,
    });

    await db.insert('preferences', {
      id: `sync-import-category-${accountId}`,
      value: 'false',
    });

    vi.spyOn(asyncStorage, 'getItem').mockResolvedValue('user-token');

    const postSpy = vi.spyOn(postModule, 'post').mockResolvedValue({
      transactions: { all: [], booked: [], pending: [] },
      balances: [],
      startingBalance: 1000,
      cursor: { newerId: '55' },
    });

    await syncAccount(undefined, undefined, accountId, remoteAccountId, '');

    expect(postSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        accountId: remoteAccountId,
        importCategory: false,
      }),
      expect.any(Object),
      60000,
    );
  });
});
