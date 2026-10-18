import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as fxApp } from '#server/fx/app';
import { isSqlConversionEnabled, setSqlConversionState } from '#shared/fx/sql';
import { q } from '#shared/query';

import { loadSqlConversionState, updateSqlConversionState } from './sqlState';

const convertedSum = {
  $sum: { $fx: ['$amount', '$account.currency', '$date'] },
};

async function setPreference(id: string, value: string) {
  await db.update('preferences', { id, value });
}

async function convertedTotal() {
  const { data } = await aqlQuery(q('transactions').calculate(convertedSum));
  return data;
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  setSqlConversionState({
    enabled: false,
    defaultCurrencyCode: '',
    rateMode: 'latest',
    rates: [],
  });

  await db.insertAccount({ id: 'cad', name: 'Chequing' });
  await db.insertAccount({ id: 'usd', name: 'US Savings', currency: 'USD' });
  await db.insertTransaction({
    account: 'cad',
    amount: 50000,
    date: '2026-01-15',
  });
  await db.insertTransaction({
    account: 'usd',
    amount: 10000,
    date: '2026-01-15',
  });
});

describe('FX_CONVERT', () => {
  it('adds up raw amounts while multiple currencies are off', async () => {
    loadSqlConversionState();
    expect(await convertedTotal()).toBe(60000);
  });

  it('converts with the rates and settings of the budget', async () => {
    await setPreference('flags.currency', 'true');
    await setPreference('flags.multiCurrency', 'true');
    await setPreference('defaultCurrencyCode', 'CAD');
    loadSqlConversionState();

    // No rate yet: counted 1:1
    expect(await convertedTotal()).toBe(60000);

    // Rates and settings saved later are picked up straight away
    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.3,
      date: '2026-01-01',
    });
    expect(await convertedTotal()).toBe(50000 + 13000);

    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.5,
      date: '2026-06-01',
    });
    expect(await convertedTotal()).toBe(50000 + 15000);

    await setPreference('currency-conversion-rate', 'historical');
    expect(await convertedTotal()).toBe(50000 + 13000);
  });

  it('converts into a default currency without decimals', async () => {
    await setPreference('flags.currency', 'true');
    await setPreference('flags.multiCurrency', 'true');
    await setPreference('defaultCurrencyCode', 'JPY');
    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'JPY',
      rate: 150,
      date: '2026-01-01',
    });
    loadSqlConversionState();

    expect(isSqlConversionEnabled()).toBe(true);
    // ¥500 in the account that follows the default, and $100.00 worth
    // ¥15,000, every amount stored with two implied decimals
    expect(await convertedTotal()).toBe(50000 + 1500000);
  });

  it('stays off with an unsupported default currency', async () => {
    await setPreference('flags.currency', 'true');
    await setPreference('flags.multiCurrency', 'true');
    await setPreference('defaultCurrencyCode', 'XYZ');
    loadSqlConversionState();

    expect(isSqlConversionEnabled()).toBe(false);
    expect(await convertedTotal()).toBe(60000);
  });

  it('skips rates synced without all of their fields', async () => {
    await setPreference('flags.currency', 'true');
    await setPreference('flags.multiCurrency', 'true');
    await setPreference('defaultCurrencyCode', 'CAD');
    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'CAD',
      rate: 1.3,
      date: '2026-01-01',
    });
    db.runQuery(
      `INSERT INTO exchange_rates (id, from_currency, to_currency, rate)
         VALUES ('no-date', 'USD', 'CAD', 2)`,
    );
    db.runQuery(
      `INSERT INTO exchange_rates (id, from_currency, to_currency, date)
         VALUES ('no-rate', 'USD', 'CAD', 20260101)`,
    );
    db.runQuery(
      `INSERT INTO exchange_rates (id, to_currency, rate, date)
         VALUES ('no-from', 'CAD', 2, 20260101)`,
    );

    expect(() => loadSqlConversionState()).not.toThrow();
    expect(() =>
      updateSqlConversionState(new Map([['exchange_rates', new Map()]])),
    ).not.toThrow();
    expect(await convertedTotal()).toBe(50000 + 13000);
  });
});
