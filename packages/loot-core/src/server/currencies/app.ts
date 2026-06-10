import { v4 as uuidv4 } from 'uuid';

import * as connection from '#platform/server/connection';
import { createApp } from '#server/app';
import * as db from '#server/db';
import { APIError } from '#server/errors';
import { mutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import { dayFromDate } from '#shared/months';
import type { AccountEntity, TransactionEntity } from '#types/models';

type CurrencyEntity = {
  id: string;
  code: string;
  name?: string | null;
  is_base?: boolean;
  sort_order?: number | null;
  tombstone?: boolean;
};

type ExchangeRateEntity = {
  id: string;
  from_currency: string;
  to_currency: string;
  date: string;
  rate: string;
  source?: string;
  transaction_count?: number;
  tombstone?: boolean;
};

export type MissingExchangeRateMeta = {
  fromCurrency: string;
  toCurrency: string;
  date: string;
};

type AccountConversionMode = 'reinterpret-as-native' | 'preserve-base-history';

export class MissingExchangeRateError extends Error {
  type = 'MissingExchangeRateError' as const;
  meta: MissingExchangeRateMeta;

  constructor(meta: MissingExchangeRateMeta) {
    super(
      `Missing exchange rate from ${meta.fromCurrency} to ${meta.toCurrency} on or before ${meta.date}`,
    );
    this.meta = meta;
  }
}

export type CurrencyHandlers = {
  'currencies-get': typeof getCurrencies;
  'currency-create': typeof createCurrency;
  'currency-set-base': typeof setBaseCurrency;
  'currency-change-base': typeof changeBaseCurrency;
  'currency-disable': typeof disableCurrency;
  'exchange-rates-get': typeof getExchangeRates;
  'exchange-rate-create': typeof createExchangeRate;
  'exchange-rate-update': typeof updateExchangeRate;
  'exchange-rate-delete': typeof deleteExchangeRate;
  'exchange-rate-resolve': typeof resolveExchangeRate;
  'account-currency-conversion-preview': typeof previewAccountCurrencyConversion;
  'account-currency-convert': typeof convertAccountCurrency;
  'account-fx-adjustment': typeof createFxAdjustment;
};

export const app = createApp<CurrencyHandlers>();

app.method('currencies-get', getCurrencies);
app.method('currency-create', mutator(undoable(createCurrency)));
app.method('currency-set-base', mutator(undoable(setBaseCurrency)));
app.method('currency-change-base', mutator(undoable(changeBaseCurrency)));
app.method('currency-disable', mutator(undoable(disableCurrency)));
app.method('exchange-rates-get', getExchangeRates);
app.method('exchange-rate-create', mutator(undoable(createExchangeRate)));
app.method('exchange-rate-update', mutator(undoable(updateExchangeRate)));
app.method('exchange-rate-delete', mutator(undoable(deleteExchangeRate)));
app.method('exchange-rate-resolve', resolveExchangeRate);
app.method(
  'account-currency-conversion-preview',
  previewAccountCurrencyConversion,
);
app.method(
  'account-currency-convert',
  mutator(undoable(convertAccountCurrency)),
);
app.method('account-fx-adjustment', mutator(undoable(createFxAdjustment)));

export function serializeMissingExchangeRateError(error: unknown) {
  if (error instanceof MissingExchangeRateError) {
    return {
      type: error.type,
      message: error.message,
      meta: error.meta,
    };
  }
  return null;
}

export async function getBaseCurrency(): Promise<string> {
  const baseCurrency = await db.first<{ code: string }>(
    'SELECT code FROM currencies WHERE is_base = 1 AND tombstone = 0 LIMIT 1',
  );
  if (baseCurrency?.code != null) {
    return baseCurrency.code;
  }

  const pref = await db.first<{ value: string }>(
    "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
  );
  return pref?.value ?? '';
}

export async function getAccountCurrency(accountId: AccountEntity['id']) {
  const account = await db.first<Pick<db.DbAccount, 'currency'>>(
    'SELECT currency FROM accounts WHERE id = ?',
    [accountId],
  );
  return account?.currency ?? (await getBaseCurrency());
}

function parseDecimalRate(rate: string): { value: bigint; scale: bigint } {
  if (!/^\d+(\.\d+)?$/.test(rate)) {
    throw APIError('exchange rate must be a positive decimal number');
  }

  const [integerPart, fractionPart = ''] = rate.split('.');
  return {
    value: BigInt(integerPart + fractionPart),
    scale: 10n ** BigInt(fractionPart.length),
  };
}

function multiplyByRate(amount: number, rate: string): number {
  const { value, scale } = parseDecimalRate(rate);
  const sign = amount < 0 ? -1n : 1n;
  const absoluteAmount = BigInt(Math.abs(amount));
  const numerator = absoluteAmount * value;
  const rounded = (numerator + scale / 2n) / scale;
  const result = rounded * sign;
  return Number(result);
}

export function divideByRate(amount: number, rate: string): number {
  const { value, scale } = parseDecimalRate(rate);
  const sign = amount < 0 ? -1n : 1n;
  const absoluteAmount = BigInt(Math.abs(amount));
  const numerator = absoluteAmount * scale;
  const rounded = (numerator + value / 2n) / value;
  const result = rounded * sign;
  return Number(result);
}

function invertRate(rate: string): string {
  const { value, scale } = parseDecimalRate(rate);
  const precision = 12n;
  const outputScale = 10n ** precision;
  const scaled = (scale * outputScale + value / 2n) / value;
  const integerPart = scaled / outputScale;
  const fractionPart = String(scaled % outputScale).padStart(
    Number(precision),
    '0',
  );
  return `${integerPart}.${fractionPart}`.replace(/\.?0+$/, '');
}

function dateReprToDateTime(value: number): string {
  return `${db.fromDateRepr(value)}T00:00:00`;
}

function normalizeExchangeRateDateTime(date: string | number): string {
  if (typeof date === 'number') {
    return dateReprToDateTime(date);
  }

  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return normalizeExchangeRateDateTime(trimmed.replace(' ', 'T'));
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(trimmed)) {
    return trimmed;
  }

  throw APIError('exchange rate date must be a valid date or date time');
}

function exchangeRateLookupDateTime(date: string): string {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T23:59:59.999`;
  }

  return normalizeExchangeRateDateTime(trimmed);
}

const exchangeRateDateTimeSql = `CASE
  WHEN typeof(date) = 'integer' THEN printf(
    '%04d-%02d-%02dT00:00:00',
    date / 10000,
    (date / 100) % 100,
    date % 100
  )
  ELSE date
END`;

export async function getEffectiveExchangeRate({
  fromCurrency,
  toCurrency,
  date,
}: {
  fromCurrency: string;
  toCurrency: string;
  date: string;
}): Promise<{
  id: string | null;
  rate: string;
  date: string;
}> {
  if (fromCurrency === toCurrency) {
    return { id: null, rate: '1', date: normalizeExchangeRateDateTime(date) };
  }

  const lookupDate = exchangeRateLookupDateTime(date);
  const row = await db.first<
    db.DbExchangeRate & { direction: 'direct' | 'reverse' }
  >(
    `SELECT *, ${exchangeRateDateTimeSql} as effective_date_time, 'direct' as direction FROM exchange_rates
     WHERE from_currency = ?
       AND to_currency = ?
       AND ${exchangeRateDateTimeSql} <= ?
       AND tombstone = 0
     UNION ALL
     SELECT *, ${exchangeRateDateTimeSql} as effective_date_time, 'reverse' as direction FROM exchange_rates
     WHERE from_currency = ?
       AND to_currency = ?
       AND ${exchangeRateDateTimeSql} <= ?
       AND tombstone = 0
     ORDER BY effective_date_time DESC, direction ASC, id DESC
     LIMIT 1`,
    [
      fromCurrency,
      toCurrency,
      lookupDate,
      toCurrency,
      fromCurrency,
      lookupDate,
    ],
  );

  if (!row) {
    throw new MissingExchangeRateError({
      fromCurrency,
      toCurrency,
      date,
    });
  }

  return {
    id: row.id,
    rate: row.direction === 'reverse' ? invertRate(row.rate) : row.rate,
    date: normalizeExchangeRateDateTime(row.date),
  };
}

export async function normalizeTransactionCurrency<
  T extends Partial<TransactionEntity>,
>(transaction: T): Promise<T> {
  if (!transaction.account || !transaction.date) {
    return transaction;
  }

  const baseCurrency = transaction.base_currency ?? (await getBaseCurrency());
  const nativeCurrency =
    transaction.native_currency ??
    (await getAccountCurrency(transaction.account));

  if (transaction.native_amount == null && transaction.amount != null) {
    transaction.native_amount = transaction.amount;
  }

  if (transaction.amount == null && transaction.native_amount != null) {
    transaction.amount = transaction.native_amount;
  }

  if (transaction.native_amount == null || transaction.amount == null) {
    return transaction;
  }

  const rate = await getEffectiveExchangeRate({
    fromCurrency: nativeCurrency,
    toCurrency: baseCurrency,
    date: transaction.date,
  });

  transaction.native_currency = nativeCurrency;
  transaction.base_currency = baseCurrency;
  transaction.exchange_rate = rate.rate;
  transaction.exchange_rate_date = rate.date;
  transaction.exchange_rate_id = rate.id;
  transaction.exchange_rate_locked = transaction.exchange_rate_locked ?? true;

  if (nativeCurrency === baseCurrency) {
    transaction.amount = transaction.native_amount;
  } else {
    transaction.amount = multiplyByRate(transaction.native_amount, rate.rate);
  }

  return transaction;
}

async function getCurrencies(): Promise<CurrencyEntity[]> {
  return db.selectWithSchema(
    'currencies',
    'SELECT * FROM currencies WHERE tombstone = 0 ORDER BY is_base DESC, sort_order, code',
    [],
  );
}

async function createCurrency({
  code,
  name,
}: {
  code: string;
  name?: string | null;
}) {
  const existingCurrency = await db.first<Pick<db.DbCurrency, 'id'>>(
    'SELECT id FROM currencies WHERE code = ? AND tombstone = 0 LIMIT 1',
    [code],
  );
  if (existingCurrency) {
    throw APIError(`Currency ${code} is already enabled`);
  }

  const id = uuidv4();
  const last = await db.first<{ sort_order: number }>(
    'SELECT sort_order FROM currencies WHERE tombstone = 0 ORDER BY sort_order DESC LIMIT 1',
  );

  await db.insert('currencies', {
    id,
    code,
    name: name ?? code,
    is_base: 0,
    sort_order: (last?.sort_order ?? 0) + 1,
    tombstone: 0,
  });
  connection.send('sync-event', { type: 'success', tables: ['currencies'] });
  return id;
}

async function getSelectedBaseCurrency(): Promise<string | null> {
  const baseCurrency = await db.first<{ code: string }>(
    'SELECT code FROM currencies WHERE is_base = 1 AND tombstone = 0 LIMIT 1',
  );
  return baseCurrency?.code ?? null;
}

async function assertEnabledCurrency(code: string) {
  const currency = await db.first<Pick<db.DbCurrency, 'id'>>(
    'SELECT id FROM currencies WHERE code = ? AND tombstone = 0 LIMIT 1',
    [code],
  );
  if (!currency) {
    throw APIError(`Currency ${code} is not enabled`);
  }
}

async function setBaseCurrency({ code }: { code: string }) {
  await assertEnabledCurrency(code);
  const existingBase = await getSelectedBaseCurrency();
  if (existingBase && existingBase !== code) {
    throw APIError(
      'Use currency-change-base to change an existing base currency',
    );
  }

  await db.run('UPDATE currencies SET is_base = 0 WHERE tombstone = 0');
  await db.run(
    'UPDATE currencies SET is_base = 1 WHERE code = ? AND tombstone = 0',
    [code],
  );
  connection.send('sync-event', { type: 'success', tables: ['currencies'] });
  return { status: 'ok' };
}

async function getCurrencyTransactions() {
  return db.selectWithSchema(
    'transactions',
    `SELECT * FROM v_transactions_internal
     WHERE is_parent = 0
       AND tombstone = 0
     ORDER BY date ASC, sort_order ASC`,
    [],
  ) as Promise<TransactionEntity[]>;
}

async function changeBaseCurrency({ code }: { code: string }) {
  await assertEnabledCurrency(code);
  const oldBaseCurrency = await getSelectedBaseCurrency();
  if (!oldBaseCurrency) {
    throw APIError('Set a base currency before changing it');
  }
  if (oldBaseCurrency === code) {
    return { status: 'ok' };
  }

  const transactions = await getCurrencyTransactions();

  await batchMessages(async () => {
    await db.run('UPDATE currencies SET is_base = 0 WHERE tombstone = 0');
    await db.run(
      'UPDATE currencies SET is_base = 1 WHERE code = ? AND tombstone = 0',
      [code],
    );

    for (const transaction of transactions) {
      const nativeCurrency =
        transaction.native_currency ||
        transaction.base_currency ||
        oldBaseCurrency;
      const nativeAmount =
        transaction.native_amount == null
          ? transaction.amount
          : transaction.native_amount;

      const rate = await getEffectiveExchangeRate({
        fromCurrency: nativeCurrency,
        toCurrency: code,
        date: transaction.date,
      });

      await db.updateTransaction({
        id: transaction.id,
        amount:
          nativeCurrency === code
            ? nativeAmount
            : multiplyByRate(nativeAmount, rate.rate),
        native_amount: nativeAmount,
        native_currency: nativeCurrency,
        base_currency: code,
        exchange_rate: rate.rate,
        exchange_rate_date: rate.date,
        exchange_rate_id: rate.id,
        exchange_rate_locked: true,
        fx_recalculated_at: new Date().toISOString(),
      });
    }
  });

  connection.send('sync-event', {
    type: 'success',
    tables: ['currencies', 'transactions'],
  });
  return { status: 'ok' };
}

async function disableCurrency({ code }: { code: string }) {
  await assertEnabledCurrency(code);
  const baseCurrency = await getSelectedBaseCurrency();
  if (!baseCurrency) {
    throw APIError('Set a base currency before disabling currencies');
  }
  if (code === baseCurrency) {
    throw APIError('The base currency cannot be disabled');
  }

  const accounts = await db.all<Pick<db.DbAccount, 'id'>>(
    'SELECT id FROM accounts WHERE currency = ? AND tombstone = 0',
    [code],
  );

  await batchMessages(async () => {
    for (const account of accounts) {
      await db.update('accounts', { id: account.id, currency: baseCurrency });

      const transactions = await getAccountTransactions(account.id);
      for (const transaction of transactions) {
        await db.updateTransaction({
          id: transaction.id,
          amount: transaction.amount,
          native_amount: transaction.amount,
          native_currency: baseCurrency,
          base_currency: baseCurrency,
          exchange_rate: '1',
          exchange_rate_date: normalizeExchangeRateDateTime(transaction.date),
          exchange_rate_id: null,
          exchange_rate_locked: true,
          fx_recalculated_at: new Date().toISOString(),
        });
      }
    }

    await db.run(
      'UPDATE currencies SET tombstone = 1 WHERE code = ? AND tombstone = 0',
      [code],
    );
  });

  connection.send('sync-event', {
    type: 'success',
    tables: ['currencies', 'accounts', 'transactions'],
  });
  return { status: 'ok', accountCount: accounts.length };
}

async function getExchangeRates({
  fromCurrency,
  toCurrency,
}: {
  fromCurrency?: string;
  toCurrency?: string;
} = {}): Promise<ExchangeRateEntity[]> {
  const filters: string[] = ['tombstone = 0'];
  const params: string[] = [];
  if (fromCurrency) {
    filters.push('from_currency = ?');
    params.push(fromCurrency);
  }
  if (toCurrency) {
    filters.push('to_currency = ?');
    params.push(toCurrency);
  }

  const rows = await db.all<db.DbExchangeRate & { transaction_count: number }>(
    `SELECT exchange_rates.*,
            (
              SELECT COUNT(*)
              FROM transactions
              WHERE transactions.exchange_rate_id = exchange_rates.id
                AND transactions.tombstone = 0
            ) as transaction_count
     FROM exchange_rates
     WHERE ${filters.join(' AND ')}
     ORDER BY ${exchangeRateDateTimeSql} DESC`,
    params,
  );

  return rows.map(row => ({
    id: row.id,
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    date: normalizeExchangeRateDateTime(row.date),
    rate: row.rate,
    source: row.source,
    transaction_count: row.transaction_count,
    tombstone: Boolean(row.tombstone),
  }));
}

async function createExchangeRate({
  fromCurrency,
  toCurrency,
  date,
  rate,
  source = 'manual',
}: {
  fromCurrency: string;
  toCurrency: string;
  date: string;
  rate: string;
  source?: string;
}) {
  parseDecimalRate(rate);
  if (fromCurrency === toCurrency) {
    throw APIError('Exchange rate currencies must be different');
  }

  const dateTime = normalizeExchangeRateDateTime(date);
  const existingRate = await db.first<Pick<db.DbExchangeRate, 'id'>>(
    `SELECT id FROM exchange_rates
     WHERE tombstone = 0
       AND ${exchangeRateDateTimeSql} = ?
       AND (
         (from_currency = ? AND to_currency = ?)
         OR (from_currency = ? AND to_currency = ?)
       )
     LIMIT 1`,
    [dateTime, fromCurrency, toCurrency, toCurrency, fromCurrency],
  );

  if (existingRate) {
    throw APIError(
      `Exchange rate for ${fromCurrency} and ${toCurrency} already exists at ${dateTime}`,
    );
  }

  const id = uuidv4();
  await db.insert('exchange_rates', {
    id,
    from_currency: fromCurrency,
    to_currency: toCurrency,
    date: dateTime,
    rate,
    source,
    tombstone: 0,
  });
  connection.send('sync-event', {
    type: 'success',
    tables: ['exchange_rates'],
  });
  return id;
}

async function getExchangeRateUsageCount(id: string) {
  const row = await db.first<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM transactions
     WHERE exchange_rate_id = ?
       AND tombstone = 0`,
    [id],
  );
  return row?.count ?? 0;
}

async function recalculateTransactionsForExchangeRate(id: string) {
  const transactions = (await db.selectWithSchema(
    'transactions',
    `SELECT * FROM v_transactions_internal
     WHERE exchange_rate_id = ?
       AND is_parent = 0
       AND tombstone = 0`,
    [id],
  )) as TransactionEntity[];

  for (const transaction of transactions) {
    if (
      !transaction.id ||
      !transaction.native_currency ||
      !transaction.base_currency ||
      transaction.native_amount == null
    ) {
      continue;
    }

    const rate = await getEffectiveExchangeRate({
      fromCurrency: transaction.native_currency,
      toCurrency: transaction.base_currency,
      date: transaction.date,
    });

    await db.updateTransaction({
      id: transaction.id,
      amount:
        transaction.native_currency === transaction.base_currency
          ? transaction.native_amount
          : multiplyByRate(transaction.native_amount, rate.rate),
      exchange_rate: rate.rate,
      exchange_rate_date: rate.date,
      exchange_rate_id: rate.id,
      exchange_rate_locked: true,
      fx_recalculated_at: new Date().toISOString(),
    });
  }
}

async function updateExchangeRate({
  id,
  rate,
  recalculateTransactions = false,
}: {
  id: string;
  rate: string;
  recalculateTransactions?: boolean;
}) {
  parseDecimalRate(rate);
  const usageCount = await getExchangeRateUsageCount(id);
  if (usageCount > 0 && !recalculateTransactions) {
    throw APIError(
      `Exchange rate is used by ${usageCount} transactions and must be recalculated`,
    );
  }

  await db.update('exchange_rates', { id, rate });
  if (usageCount > 0) {
    await recalculateTransactionsForExchangeRate(id);
  }

  connection.send('sync-event', {
    type: 'success',
    tables: ['exchange_rates', 'transactions'],
  });
  return { status: 'ok', transactionCount: usageCount };
}

async function deleteExchangeRate({ id }: { id: string }) {
  const usageCount = await getExchangeRateUsageCount(id);
  if (usageCount > 0) {
    throw APIError(
      `Exchange rate is used by ${usageCount} transactions and cannot be deleted`,
    );
  }

  await db.update('exchange_rates', { id, tombstone: 1 });
  connection.send('sync-event', {
    type: 'success',
    tables: ['exchange_rates'],
  });
  return { status: 'ok' };
}

async function resolveExchangeRate(args: {
  fromCurrency: string;
  toCurrency: string;
  date: string;
}) {
  return getEffectiveExchangeRate(args);
}

async function getAccountTransactions(accountId: AccountEntity['id']) {
  return db.selectWithSchema(
    'transactions',
    `SELECT * FROM v_transactions_internal
     WHERE account = ?
       AND is_parent = 0
       AND tombstone = 0
     ORDER BY date ASC, sort_order ASC`,
    [accountId],
  ) as Promise<TransactionEntity[]>;
}

async function previewAccountCurrencyConversion({
  accountId,
  targetCurrency,
}: {
  accountId: AccountEntity['id'];
  targetCurrency: string;
}) {
  const transactions = await getAccountTransactions(accountId);
  const baseCurrency = await getBaseCurrency();
  const missingRates: MissingExchangeRateMeta[] = [];

  for (const transaction of transactions) {
    try {
      await getEffectiveExchangeRate({
        fromCurrency: targetCurrency,
        toCurrency: baseCurrency,
        date: transaction.date,
      });
    } catch (error) {
      const missing = serializeMissingExchangeRateError(error);
      if (missing) {
        missingRates.push(missing.meta);
      } else {
        throw error;
      }
    }
  }

  return {
    accountId,
    targetCurrency,
    baseCurrency,
    transactionCount: transactions.length,
    firstDate: transactions[0]?.date ?? null,
    lastDate: transactions.at(-1)?.date ?? null,
    missingRates,
  };
}

async function convertAccountCurrency({
  accountId,
  targetCurrency,
  mode,
  includeReconciled = false,
}: {
  accountId: AccountEntity['id'];
  targetCurrency: string;
  mode: AccountConversionMode;
  includeReconciled?: boolean;
}) {
  const baseCurrency = await getBaseCurrency();
  const transactions = await getAccountTransactions(accountId);

  await batchMessages(async () => {
    await db.update('accounts', { id: accountId, currency: targetCurrency });

    for (const transaction of transactions) {
      if (transaction.reconciled && !includeReconciled) {
        continue;
      }

      const rate = await getEffectiveExchangeRate({
        fromCurrency: targetCurrency,
        toCurrency: baseCurrency,
        date: transaction.date,
      });
      const nativeAmount =
        mode === 'reinterpret-as-native'
          ? transaction.amount
          : divideByRate(transaction.amount, rate.rate);

      await db.updateTransaction({
        id: transaction.id,
        amount:
          mode === 'reinterpret-as-native'
            ? multiplyByRate(nativeAmount, rate.rate)
            : transaction.amount,
        native_amount: nativeAmount,
        native_currency: targetCurrency,
        base_currency: baseCurrency,
        exchange_rate: rate.rate,
        exchange_rate_date: rate.date,
        exchange_rate_id: rate.id,
        exchange_rate_locked: true,
        fx_recalculated_at: new Date().toISOString(),
      });
    }
  });

  connection.send('sync-event', {
    type: 'success',
    tables: ['accounts', 'transactions'],
  });
  return { status: 'ok' };
}

async function createFxAdjustment({
  accountId,
  date,
  statementBalance,
  payee,
  category,
}: {
  accountId: AccountEntity['id'];
  date: string;
  statementBalance: number;
  payee?: string | null;
  category?: string | null;
}) {
  const current = await db.first<{ balance: number }>(
    `SELECT SUM(IFNULL(native_amount, amount)) as balance
     FROM transactions
     WHERE acct = ?
       AND isParent = 0
       AND tombstone = 0
       AND date <= ?`,
    [accountId, db.toDateRepr(dayFromDate(date))],
  );
  const currentBalance = current?.balance ?? 0;
  const delta = statementBalance - currentBalance;

  if (delta === 0) {
    return { status: 'ok', transactionId: null };
  }

  const normalized = await normalizeTransactionCurrency({
    id: uuidv4(),
    account: accountId,
    date,
    amount: delta,
    native_amount: delta,
    payee,
    category: category ?? undefined,
    notes: 'Exchange rate adjustment',
    cleared: true,
  });

  const transactionId = await db.insertTransaction(normalized);
  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions', 'accounts'],
  });
  return { status: 'ok', transactionId };
}
