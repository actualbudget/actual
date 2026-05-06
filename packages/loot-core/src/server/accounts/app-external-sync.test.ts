// @ts-strict-ignore
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';

import { app } from './app';

const linkExternalSyncAccount = app.handlers['account-external-sync-link'];
const unlinkExternalSyncAccount = app.handlers['account-external-sync-unlink'];

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

describe('external account sync metadata', () => {
  it('writes external sync metadata and creates a bank row', async () => {
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
    });

    await linkExternalSyncAccount({
      id: 'acct1',
      metadata: {
        syncSource: 'external',
        providerAccountId: 'provider-acct-1',
        institutionName: 'External Credit Union',
        institutionExternalId: 'institution-1',
        mask: '1234',
        officialName: 'Checking Account',
        balanceCurrent: 1000,
        balanceAvailable: 900,
        balanceLimit: 2000,
        lastSync: '1715000000000',
      },
    });

    const account = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      ['acct1'],
    );
    const bank = await db.first<db.DbBank>('SELECT * FROM banks WHERE id = ?', [
      account!.bank!,
    ]);

    expect(account).toMatchObject({
      id: 'acct1',
      account_id: 'provider-acct-1',
      mask: '1234',
      official_name: 'Checking Account',
      balance_current: 1000,
      balance_available: 900,
      balance_limit: 2000,
      account_sync_source: 'external',
      last_sync: '1715000000000',
    });
    expect(bank).toMatchObject({
      name: 'External Credit Union',
      bank_id: 'external:institution-1',
    });
  });

  it('reuses native unlink semantics for external accounts', async () => {
    await db.insertWithUUID('banks', {
      id: 'bank1',
      bank_id: 'external:institution-1',
      name: 'External Credit Union',
    });
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
      account_id: 'provider-acct-1',
      bank: 'bank1',
      mask: '1234',
      official_name: 'Checking Account',
      balance_current: 1000,
      balance_available: 900,
      balance_limit: 2000,
      account_sync_source: 'external',
      last_sync: '1715000000000',
    });

    await unlinkExternalSyncAccount({ id: 'acct1' });

    const account = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      ['acct1'],
    );

    expect(account).toMatchObject({
      id: 'acct1',
      account_id: null,
      bank: null,
      balance_current: null,
      balance_available: null,
      balance_limit: null,
      account_sync_source: null,
      mask: '1234',
      official_name: 'Checking Account',
      last_sync: '1715000000000',
    });
  });
});
