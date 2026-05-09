import { accountModel } from '#server/api-models';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';

import { app } from './app';

declare global {
  var emptyDatabase: (deleteFile?: boolean) => () => Promise<void>;
}

const emptyDatabase = globalThis.emptyDatabase;
const updateAccount = app.handlers['account-update'];
const getAccounts = app.handlers['accounts-get'];
const unlinkAccount = app.handlers['account-unlink'];

beforeEach(async () => {
  await emptyDatabase()();
  await loadMappings();
});

describe('external account sync metadata', () => {
  it('writes external sync metadata and creates a bank row', async () => {
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
    });

    await updateAccount({
      id: 'acct1',
      account_sync_source: 'external',
      account_id: 'provider-acct-1',
      bankName: 'External Credit Union',
      bankId: 'test-provider:institution-1',
      mask: '1234',
      official_name: 'Checking Account',
      balance_current: 1000,
      balance_available: 900,
      balance_limit: 2000,
      last_sync: '1715000000000',
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
      bank_sync_status: null,
    });
    expect(bank).toMatchObject({
      name: 'External Credit Union',
      bank_id: 'test-provider:institution-1',
    });
  });

  it('reuses native unlink semantics for external accounts', async () => {
    await db.insertWithUUID('banks', {
      id: 'bank1',
      bank_id: 'test-provider:institution-1',
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

    await unlinkAccount({ id: 'acct1' });

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
      bank_sync_status: null,
      mask: '1234',
      official_name: 'Checking Account',
      last_sync: '1715000000000',
    });
  });

  it('does not overload account-update with unlink behavior', async () => {
    await db.insertWithUUID('banks', {
      id: 'bank1',
      bank_id: 'test-provider:institution-1',
      name: 'External Credit Union',
    });
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
      account_id: 'provider-acct-1',
      bank: 'bank1',
      account_sync_source: 'external',
    });

    await expect(
      updateAccount({
        id: 'acct1',
        account_sync_source: null,
      }),
    ).rejects.toThrow('Use account-unlink to unlink an account.');
  });

  it('unlinks an existing provider before linking external metadata', async () => {
    await db.insertWithUUID('banks', {
      id: 'bank1',
      bank_id: 'gc-bank',
      name: 'GoCardless Bank',
    });
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
      account_id: 'gc-acct-1',
      bank: 'bank1',
      balance_current: 500,
      balance_available: 400,
      balance_limit: 1000,
      account_sync_source: 'goCardless',
    });

    await updateAccount({
      id: 'acct1',
      account_sync_source: 'external',
      account_id: 'provider-acct-1',
      bankName: 'External Credit Union',
      bankId: 'test-provider:institution-1',
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
      bank: bank!.id,
      balance_current: null,
      balance_available: null,
      balance_limit: null,
      account_sync_source: 'external',
    });
    expect(bank).toMatchObject({
      name: 'External Credit Union',
      bank_id: 'test-provider:institution-1',
    });
  });

  it('returns external sync metadata through the existing accounts shape', async () => {
    await db.insertWithUUID('banks', {
      id: 'bank1',
      bank_id: 'test-provider:institution-1',
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
    await db.insertAccount({
      id: 'acct2',
      name: 'Cash',
    });

    const accounts = await getAccounts();
    const linkedAccount = accounts.find(account => account.id === 'acct1');
    const unlinkedAccount = accounts.find(account => account.id === 'acct2');

    expect(accountModel.toExternal(linkedAccount!)).toMatchObject({
      id: 'acct1',
      account_sync_source: 'external',
      account_id: 'provider-acct-1',
      bank_id: 'test-provider:institution-1',
      bank_name: 'External Credit Union',
      mask: '1234',
      official_name: 'Checking Account',
      balance_current: 1000,
      balance_available: 900,
      balance_limit: 2000,
      last_sync: '1715000000000',
      bank_sync_status: null,
    });

    expect(accountModel.toExternal(unlinkedAccount!)).toMatchObject({
      id: 'acct2',
      account_sync_source: null,
      account_id: null,
      bank_id: null,
      bank_name: null,
      mask: null,
      official_name: null,
      balance_current: null,
      balance_available: null,
      balance_limit: null,
      last_sync: null,
      bank_sync_status: null,
    });
  });

  it('returns bank_id for non-external linked accounts too', async () => {
    await db.insertWithUUID('banks', {
      id: 'bank1',
      bank_id: 'gc-bank',
      name: 'GoCardless Bank',
    });
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
      account_id: 'gc-acct-1',
      bank: 'bank1',
      account_sync_source: 'goCardless',
    });

    const account = (await getAccounts()).find(
      existingAccount => existingAccount.id === 'acct1',
    );

    expect(accountModel.toExternal(account!)).toMatchObject({
      id: 'acct1',
      account_sync_source: 'goCardless',
      account_id: 'gc-acct-1',
      bank_id: 'gc-bank',
      bank_name: 'GoCardless Bank',
      bank_sync_status: null,
    });
  });

  it('allows updating bank_sync_status through the existing account update handler', async () => {
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
      account_id: 'external-account-1',
      account_sync_source: 'external',
    });

    await updateAccount({
      id: 'acct1',
      bank_sync_status: 'sync-requested',
    });

    const account = (await getAccounts()).find(
      existingAccount => existingAccount.id === 'acct1',
    );

    expect(accountModel.toExternal(account!)).toMatchObject({
      id: 'acct1',
      bank_sync_status: 'sync-requested',
    });
  });

  it('requires a stable bankId for external links', async () => {
    await db.insertAccount({
      id: 'acct1',
      name: 'Checking',
    });

    await expect(
      updateAccount({
        id: 'acct1',
        account_sync_source: 'external',
        account_id: 'provider-acct-1',
        bankName: 'External Credit Union',
      }),
    ).rejects.toThrow('bankId is required');
  });
});
