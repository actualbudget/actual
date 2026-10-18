import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { setSqlConversionState } from '#shared/fx/sql';

import { app } from './app';

function setMultiCurrencyEnabled(enabled: boolean) {
  setSqlConversionState({
    enabled,
    defaultCurrencyCode: 'CAD',
    rateMode: 'latest',
    rates: [],
  });
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  setMultiCurrencyEnabled(true);
});

afterEach(() => {
  setMultiCurrencyEnabled(false);
});

async function getCurrencies() {
  const accounts = await app.handlers['accounts-get']();
  return Object.fromEntries(
    accounts.map(account => [account.id, account.currency]),
  );
}

// A yen account with ¥1,500 in it, stored like every amount with two
// implied decimals
async function insertYenAccountWithTransaction() {
  await db.insertAccount({ id: 'yen', name: 'Yen', currency: 'JPY' });
  await db.insertTransaction({
    account: 'yen',
    amount: 150000,
    date: '2026-10-01',
  });
}

async function getAmounts(accountId: string) {
  return (await db.getTransactions(accountId)).map(({ amount }) => amount);
}

describe('account-update', () => {
  it('sets, keeps and clears the currency', async () => {
    await db.insertAccount({ id: 'acct', name: 'US Savings' });

    await app.handlers['account-update']({ id: 'acct', currency: 'USD' });
    expect(await getCurrencies()).toEqual({ acct: 'USD' });

    await app.handlers['account-update']({ id: 'acct', name: 'USD Savings' });
    expect(await getCurrencies()).toEqual({ acct: 'USD' });

    await app.handlers['account-update']({ id: 'acct', currency: null });
    expect(await getCurrencies()).toEqual({ acct: null });
  });

  it('sets a currency without decimals', async () => {
    await db.insertAccount({ id: 'acct', name: 'Chequing' });

    await app.handlers['account-update']({ id: 'acct', currency: 'JPY' });

    expect(await getCurrencies()).toEqual({ acct: 'JPY' });
  });

  it.each(['XYZ', ''])('refuses the unsupported currency "%s"', async code => {
    await db.insertAccount({ id: 'acct', name: 'Chequing' });

    await expect(
      app.handlers['account-update']({ id: 'acct', currency: code }),
    ).rejects.toThrow(/unsupported currency/);
  });

  it('keeps the currency of an account sent back whole', async () => {
    await insertYenAccountWithTransaction();
    const [account] = await app.handlers['accounts-get']();

    // The sidebar renames an account by sending all of it back
    await app.handlers['account-update']({ ...account, name: 'Yen wallet' });

    const [renamed] = await app.handlers['accounts-get']();
    expect(renamed).toMatchObject({ name: 'Yen wallet', currency: 'JPY' });
  });

  it('only relabels the amounts of an account with transactions', async () => {
    await insertYenAccountWithTransaction();

    await app.handlers['account-update']({ id: 'yen', currency: 'USD' });

    expect(await getCurrencies()).toEqual({ yen: 'USD' });
    expect(await getAmounts('yen')).toEqual([150000]);
  });
});

describe('accounts-set-currency', () => {
  it('sets the currency of several accounts at once', async () => {
    await db.insertAccount({ id: 'acct1', name: 'Chequing' });
    await db.insertAccount({ id: 'acct2', name: 'Savings' });

    await app.handlers['accounts-set-currency']({
      ids: ['acct1', 'acct2'],
      currency: 'CAD',
    });

    expect(await getCurrencies()).toEqual({ acct1: 'CAD', acct2: 'CAD' });
  });

  it('relabels accounts with transactions in any currency', async () => {
    await db.insertAccount({ id: 'acct', name: 'Chequing' });
    await insertYenAccountWithTransaction();

    await app.handlers['accounts-set-currency']({
      ids: ['acct', 'yen'],
      currency: 'USD',
    });

    expect(await getCurrencies()).toEqual({ acct: 'USD', yen: 'USD' });
    expect(await getAmounts('yen')).toEqual([150000]);
  });

  it('leaves accounts that already have the currency as they are', async () => {
    await insertYenAccountWithTransaction();

    await app.handlers['accounts-set-currency']({
      ids: ['yen'],
      currency: 'JPY',
    });

    expect(await getCurrencies()).toEqual({ yen: 'JPY' });
  });

  it('sets a currency without decimals', async () => {
    await db.insertAccount({ id: 'acct', name: 'Chequing' });

    await app.handlers['accounts-set-currency']({
      ids: ['acct'],
      currency: 'KRW',
    });

    expect(await getCurrencies()).toEqual({ acct: 'KRW' });
  });

  it('refuses accounts that do not exist instead of creating them', async () => {
    await db.insertAccount({ id: 'acct', name: 'Chequing' });

    await expect(
      app.handlers['accounts-set-currency']({
        ids: ['acct', 'missing'],
        currency: 'USD',
      }),
    ).rejects.toThrow('account does not exist: missing');

    const rows = await db.all<Pick<db.DbAccount, 'id' | 'currency'>>(
      'SELECT id, currency FROM accounts',
    );
    expect(rows).toEqual([{ id: 'acct', currency: null }]);
  });
});

describe('account-create', () => {
  it('stores the starting balance in the account currency', async () => {
    const id = await app.handlers['account-create']({
      name: 'US Savings',
      balance: 12.34,
      currency: 'USD',
    });

    expect(await getCurrencies()).toEqual({ [id]: 'USD' });
    const [start] = await db.getTransactions(id);
    expect(start.amount).toBe(1234);
  });

  it('stores the starting balance of a currency without decimals at the same scale', async () => {
    const id = await app.handlers['account-create']({
      name: 'Yen wallet',
      balance: 1500,
      currency: 'JPY',
    });

    expect(await getCurrencies()).toEqual({ [id]: 'JPY' });
    expect(await getAmounts(id)).toEqual([150000]);
  });
});

describe('while multiple currencies are off', () => {
  beforeEach(() => {
    setMultiCurrencyEnabled(false);
  });

  it('refuses to change the currency of an account', async () => {
    await db.insertAccount({ id: 'acct', name: 'Chequing' });

    await expect(
      app.handlers['account-update']({ id: 'acct', currency: 'USD' }),
    ).rejects.toThrow('multiple currencies are not enabled');
    await expect(
      app.handlers['accounts-set-currency']({ ids: ['acct'], currency: 'USD' }),
    ).rejects.toThrow('multiple currencies are not enabled');
    expect(await getCurrencies()).toEqual({ acct: null });
  });

  it('refuses to create an account with a currency', async () => {
    await expect(
      app.handlers['account-create']({ name: 'US Savings', currency: 'USD' }),
    ).rejects.toThrow('multiple currencies are not enabled');
    expect(await getCurrencies()).toEqual({});
  });

  it('still saves accounts whose currency stays the same', async () => {
    await db.insertAccount({ id: 'acct', name: 'Savings', currency: 'USD' });
    const id = await app.handlers['account-create']({ name: 'Chequing' });

    await app.handlers['account-update']({
      id: 'acct',
      name: 'US Savings',
      currency: 'USD',
    });
    await app.handlers['accounts-set-currency']({
      ids: ['acct'],
      currency: 'USD',
    });

    expect(await getCurrencies()).toEqual({ acct: 'USD', [id]: null });
  });
});
