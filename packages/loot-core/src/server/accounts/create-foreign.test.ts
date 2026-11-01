import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';

import { app } from './app';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const create = app.handlers['account-create'];

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
});

const counts = () => ({
  accounts: db.runQuery('SELECT id FROM accounts', [], true).length,
  transactions: db.runQuery('SELECT id FROM transactions', [], true).length,
});

describe('creating foreign accounts', () => {
  it('needs a rate or base for a starting balance, creating nothing otherwise', async () => {
    const before = counts();
    await expect(
      create({ name: 'Yen', balance: 1500, currency: 'JPY' }),
    ).rejects.toThrow('rate-unavailable');
    expect(counts()).toEqual(before);
  });

  it('uses an explicit base for the starting balance', async () => {
    const id = await create({
      name: 'Yen',
      balance: 1500,
      currency: 'JPY',
      startingBalanceBase: 1000,
    });
    expect(
      db.firstSync(
        'SELECT amount, transaction_amount FROM transactions WHERE acct = ?',
        [id],
      ),
    ).toEqual({ amount: 1000, transaction_amount: 1500 });
  });

  it('converts the starting balance at a saved rate', async () => {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency: 'KWD',
      rate: '0.3',
      kind: 'standing',
      // Tests may run with a fixed clock; a standing rate applies after it.
      date: '2000-01-01',
    });
    const id = await create({ name: 'Dinar', balance: 3, currency: 'KWD' });
    expect(
      db.firstSync(
        'SELECT amount, transaction_amount FROM transactions WHERE acct = ?',
        [id],
      ),
    ).toEqual({ amount: 1000, transaction_amount: 3000 });
  });

  it('creates an empty foreign account without a rate', async () => {
    const id = await create({ name: 'Yen', currency: 'JPY' });
    expect(
      db.firstSync(
        'SELECT currency, currency_precision FROM accounts WHERE id = ?',
        [id],
      ),
    ).toEqual({ currency: 'JPY', currency_precision: 0 });
  });
});
