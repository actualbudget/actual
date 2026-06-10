import * as db from '#server/db';

import type { MissingExchangeRateError } from './app';
import {
  app,
  getEffectiveExchangeRate,
  normalizeTransactionCurrency,
} from './app';

beforeEach(global.emptyDatabase());

async function setupBaseCurrency() {
  await db.insert('preferences', {
    id: 'defaultCurrencyCode',
    value: 'BRL',
  });
  await db.insert('currencies', {
    id: 'brl',
    code: 'BRL',
    name: 'Brazilian Real',
    is_base: 1,
    sort_order: 0,
    tombstone: 0,
  });
  await db.insert('currencies', {
    id: 'usd',
    code: 'USD',
    name: 'US Dollar',
    is_base: 0,
    sort_order: 1,
    tombstone: 0,
  });
}

async function insertRate(date: string, rate: string) {
  await db.insert('exchange_rates', {
    id: `usd-brl-${date}`,
    from_currency: 'USD',
    to_currency: 'BRL',
    date: date.includes('T') ? date : `${date}T00:00:00`,
    rate,
    source: 'manual',
    tombstone: 0,
  });
}

describe('multi-currency exchange rates', () => {
  test('uses newest exchange rate on or before transaction date', async () => {
    await setupBaseCurrency();
    await insertRate('2026-10-09', '5.10');
    await insertRate('2026-10-11', '5.30');

    const rate = await getEffectiveExchangeRate({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-10',
    });

    expect(rate.rate).toBe('5.10');
    expect(rate.date).toBe('2026-10-09T00:00:00');
  });

  test('uses the newest intraday exchange rate at or before the lookup time', async () => {
    await setupBaseCurrency();
    await insertRate('2026-10-10T09:00:00', '5.10');
    await insertRate('2026-10-10T15:00:00', '5.30');

    const morningRate = await getEffectiveExchangeRate({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-10T10:00:00',
    });
    const dateOnlyRate = await getEffectiveExchangeRate({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-10',
    });

    expect(morningRate).toMatchObject({
      rate: '5.10',
      date: '2026-10-10T09:00:00',
    });
    expect(dateOnlyRate).toMatchObject({
      rate: '5.30',
      date: '2026-10-10T15:00:00',
    });
  });

  test('throws a structured missing exchange rate error', async () => {
    await setupBaseCurrency();

    await expect(
      getEffectiveExchangeRate({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        date: '2026-10-10',
      }),
    ).rejects.toMatchObject({
      type: 'MissingExchangeRateError',
      meta: {
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        date: '2026-10-10',
      },
    } satisfies Partial<MissingExchangeRateError>);
  });

  test('uses inverse counter exchange rate when direct rate is missing', async () => {
    await setupBaseCurrency();
    await insertRate('2026-10-09', '5.10');

    const rate = await getEffectiveExchangeRate({
      fromCurrency: 'BRL',
      toCurrency: 'USD',
      date: '2026-10-10',
    });

    expect(rate.rate).toBe('0.196078431373');
    expect(rate.date).toBe('2026-10-09T00:00:00');
  });

  test('rejects duplicate direct exchange rate for the same date', async () => {
    await setupBaseCurrency();
    await app.handlers['exchange-rate-create']({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-09',
      rate: '5.10',
    });

    await expect(
      app.handlers['exchange-rate-create']({
        fromCurrency: 'USD',
        toCurrency: 'BRL',
        date: '2026-10-09',
        rate: '5.20',
      }),
    ).rejects.toThrow('already exists');
  });

  test('rejects exchange rates from a currency to itself', async () => {
    await setupBaseCurrency();

    await expect(
      app.handlers['exchange-rate-create']({
        fromCurrency: 'USD',
        toCurrency: 'USD',
        date: '2026-10-09',
        rate: '1',
      }),
    ).rejects.toThrow('must be different');
  });

  test('rejects duplicate counter exchange rate for the same date', async () => {
    await setupBaseCurrency();
    await app.handlers['exchange-rate-create']({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-09',
      rate: '5.10',
    });

    await expect(
      app.handlers['exchange-rate-create']({
        fromCurrency: 'BRL',
        toCurrency: 'USD',
        date: '2026-10-09',
        rate: '0.196078431373',
      }),
    ).rejects.toThrow('already exists');
  });

  test('normalizes base currency transactions with rate 1', async () => {
    await setupBaseCurrency();
    await db.insertAccount({
      id: 'checking',
      name: 'Checking',
      currency: 'BRL',
    });

    const transaction = await normalizeTransactionCurrency({
      account: 'checking',
      date: '2026-10-10',
      amount: 1234,
    });

    expect(transaction).toMatchObject({
      amount: 1234,
      native_amount: 1234,
      native_currency: 'BRL',
      base_currency: 'BRL',
      exchange_rate: '1',
      exchange_rate_date: '2026-10-10T00:00:00',
    });
  });

  test('normalizes foreign transactions into base amount', async () => {
    await setupBaseCurrency();
    await insertRate('2026-10-09', '5.10');
    await db.insertAccount({ id: 'usd', name: 'USD Wallet', currency: 'USD' });

    const transaction = await normalizeTransactionCurrency({
      account: 'usd',
      date: '2026-10-10',
      amount: 1000,
    });

    expect(transaction).toMatchObject({
      amount: 5100,
      native_amount: 1000,
      native_currency: 'USD',
      base_currency: 'BRL',
      exchange_rate: '5.10',
      exchange_rate_date: '2026-10-09T00:00:00',
    });
  });
});

describe('account currency conversion', () => {
  test('can reinterpret existing account history as native currency', async () => {
    await setupBaseCurrency();
    await insertRate('2026-10-09', '5.10');
    await db.insertAccount({ id: 'old', name: 'Old USD', currency: 'BRL' });
    await db.insertTransaction({
      id: 'transaction',
      account: 'old',
      date: '2026-10-10',
      amount: 1000,
    });

    await app.handlers['account-currency-convert']({
      accountId: 'old',
      targetCurrency: 'USD',
      mode: 'reinterpret-as-native',
      includeReconciled: true,
    });

    const transaction = await db.getTransaction('transaction');
    expect(transaction).toMatchObject({
      amount: 5100,
      native_amount: 1000,
      native_currency: 'USD',
      base_currency: 'BRL',
    });
  });
});

describe('base currency management', () => {
  test('enabling a currency does not make it the base currency', async () => {
    await db.insert('preferences', {
      id: 'defaultCurrencyCode',
      value: 'BRL',
    });

    await app.handlers['currency-create']({
      code: 'USD',
      name: 'US Dollar',
    });

    const currencies = await app.handlers['currencies-get']();
    expect(currencies).toHaveLength(1);
    expect(currencies[0]).toMatchObject({
      code: 'USD',
      is_base: false,
    });
  });

  test('does not enable the same currency twice', async () => {
    await setupBaseCurrency();

    await expect(
      app.handlers['currency-create']({
        code: 'USD',
        name: 'US Dollar',
      }),
    ).rejects.toThrow('already enabled');
  });

  test('changes base currency using counter exchange rates', async () => {
    await setupBaseCurrency();
    await insertRate('2026-10-09', '5.10');
    await db.insertAccount({ id: 'brl', name: 'BRL Wallet', currency: 'BRL' });
    await db.insertTransaction({
      id: 'transaction',
      account: 'brl',
      date: '2026-10-10',
      amount: 5100,
      native_amount: 5100,
      native_currency: 'BRL',
      base_currency: 'BRL',
      exchange_rate: '1',
      exchange_rate_date: '2026-10-10T00:00:00',
      exchange_rate_locked: true,
    });

    await app.handlers['currency-change-base']({ code: 'USD' });

    const transaction = await db.getTransaction('transaction');
    expect(transaction).toMatchObject({
      amount: 1000,
      native_amount: 5100,
      native_currency: 'BRL',
      base_currency: 'USD',
      exchange_rate: '0.196078431373',
      exchange_rate_date: '2026-10-09T00:00:00',
    });
  });

  test('does not disable the base currency', async () => {
    await setupBaseCurrency();

    await expect(
      app.handlers['currency-disable']({ code: 'BRL' }),
    ).rejects.toThrow('base currency cannot be disabled');
  });

  test('disables non-base currency and converts accounts to base currency', async () => {
    await setupBaseCurrency();
    await db.insertAccount({ id: 'usd', name: 'USD Wallet', currency: 'USD' });
    await db.insertTransaction({
      id: 'transaction',
      account: 'usd',
      date: '2026-10-10',
      amount: 5100,
      native_amount: 1000,
      native_currency: 'USD',
      base_currency: 'BRL',
      exchange_rate: '5.10',
      exchange_rate_date: '2026-10-09T00:00:00',
      exchange_rate_locked: true,
    });

    await app.handlers['currency-disable']({ code: 'USD' });

    const account = await db.getAccount('usd');
    expect(account).toMatchObject({ currency: 'BRL' });

    const transaction = await db.getTransaction('transaction');
    expect(transaction).toMatchObject({
      amount: 5100,
      native_amount: 5100,
      native_currency: 'BRL',
      base_currency: 'BRL',
      exchange_rate: '1',
      exchange_rate_date: '2026-10-10T00:00:00',
      exchange_rate_id: null,
    });

    const currencies = await app.handlers['currencies-get']();
    expect(currencies.map(currency => currency.code)).toEqual(['BRL']);
  });
});

describe('exchange rate lifecycle', () => {
  test('deletes exchange rates that are not used by transactions', async () => {
    await setupBaseCurrency();
    const id = await app.handlers['exchange-rate-create']({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-09',
      rate: '5.10',
    });

    await app.handlers['exchange-rate-delete']({ id });

    const rates = await app.handlers['exchange-rates-get']();
    expect(rates).toHaveLength(0);
  });

  test('does not delete exchange rates used by transactions', async () => {
    await setupBaseCurrency();
    const id = await app.handlers['exchange-rate-create']({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-09',
      rate: '5.10',
    });
    await db.insertAccount({ id: 'usd', name: 'USD Wallet', currency: 'USD' });
    await db.insertTransaction({
      id: 'transaction',
      account: 'usd',
      date: '2026-10-10',
      amount: 5100,
      native_amount: 1000,
      native_currency: 'USD',
      base_currency: 'BRL',
      exchange_rate: '5.10',
      exchange_rate_date: '2026-10-09T00:00:00',
      exchange_rate_id: id,
      exchange_rate_locked: true,
    });

    await expect(app.handlers['exchange-rate-delete']({ id })).rejects.toThrow(
      'cannot be deleted',
    );
  });

  test('requires recalculation confirmation when editing a used exchange rate', async () => {
    await setupBaseCurrency();
    const id = await app.handlers['exchange-rate-create']({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-09',
      rate: '5.10',
    });
    await db.insertAccount({ id: 'usd', name: 'USD Wallet', currency: 'USD' });
    await db.insertTransaction({
      id: 'transaction',
      account: 'usd',
      date: '2026-10-10',
      amount: 5100,
      native_amount: 1000,
      native_currency: 'USD',
      base_currency: 'BRL',
      exchange_rate: '5.10',
      exchange_rate_date: '2026-10-09T00:00:00',
      exchange_rate_id: id,
      exchange_rate_locked: true,
    });

    await expect(
      app.handlers['exchange-rate-update']({ id, rate: '5.20' }),
    ).rejects.toThrow('must be recalculated');
  });

  test('recalculates transactions when editing a used exchange rate after confirmation', async () => {
    await setupBaseCurrency();
    const id = await app.handlers['exchange-rate-create']({
      fromCurrency: 'USD',
      toCurrency: 'BRL',
      date: '2026-10-09',
      rate: '5.10',
    });
    await db.insertAccount({ id: 'usd', name: 'USD Wallet', currency: 'USD' });
    await db.insertTransaction({
      id: 'transaction',
      account: 'usd',
      date: '2026-10-10',
      amount: 5100,
      native_amount: 1000,
      native_currency: 'USD',
      base_currency: 'BRL',
      exchange_rate: '5.10',
      exchange_rate_date: '2026-10-09T00:00:00',
      exchange_rate_id: id,
      exchange_rate_locked: true,
    });

    await app.handlers['exchange-rate-update']({
      id,
      rate: '5.20',
      recalculateTransactions: true,
    });

    const transaction = await db.getTransaction('transaction');
    expect(transaction).toMatchObject({
      amount: 5200,
      exchange_rate: '5.20',
      exchange_rate_id: id,
    });
  });
});
