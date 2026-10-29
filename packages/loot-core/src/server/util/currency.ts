import * as db from '#server/db';
import * as prefs from '#server/prefs';
import {
  isReviewedCurrency,
  parseAmountEncoding,
  reviewedAmountEncoding,
} from '#shared/amount-encoding';

export async function getDefaultCurrencyCode(): Promise<string> {
  const row = await db.first<Pick<db.DbPreference, 'value'>>(
    "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
  );
  return row?.value ?? '';
}

/**
 * Set when the first explicit account currency is stored and never cleared,
 * so frozen base integers keep their currency through deletion and undo.
 */
export const BASE_CURRENCY_LOCK = 'multicurrencyBaseCurrency';

export async function getBaseCurrencyLock(): Promise<string | null> {
  const row = await db.first<{ value: string }>(
    'SELECT value FROM preferences WHERE id = ?',
    [BASE_CURRENCY_LOCK],
  );
  return row?.value ?? null;
}

export async function assertBaseCurrencyChangeAllowed(
  code: string,
): Promise<void> {
  const lock = await getBaseCurrencyLock();
  if (lock !== null && code !== lock) {
    throw new Error('base-currency-locked');
  }
}

/**
 * Fields to store with an account currency: the recorded native precision
 * and, for the first explicit currency, the permanent base-currency lock in
 * the same message batch.
 */
export async function accountCurrencyFields(
  currency: string | null,
): Promise<{ currency: string | null; currency_precision: number | null }> {
  if (currency === null) {
    return { currency: null, currency_precision: null };
  }
  if ((await getBaseCurrencyLock()) === null) {
    await db.update('preferences', {
      id: BASE_CURRENCY_LOCK,
      value: await getDefaultCurrencyCode(),
    });
  }
  return {
    currency,
    currency_precision: reviewedAmountEncoding(currency).precision,
  };
}

export async function initializeImportedAmountEncoding(
  currencyCode: string,
): Promise<number> {
  const encoding = reviewedAmountEncoding(currencyCode);
  const value = JSON.stringify(encoding);
  db.runQuery(
    "INSERT OR REPLACE INTO preferences (id, value) VALUES ('defaultCurrencyCode', ?), ('amountEncoding', ?)",
    [currencyCode, value],
  );
  await prefs.savePrefs({ amountEncoding: value });
  return encoding.precision;
}

export function getRecordedAmountPrecision(): number {
  return parseAmountEncoding(prefs.getPrefs()?.amountEncoding)?.precision ?? 2;
}

async function isFlagOn(name: string): Promise<boolean> {
  const row = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    [`flags.${name}`],
  );
  return row?.value === 'true';
}

/** Multicurrency needs both flags and a selected, reviewed budget currency. */
export async function isMulticurrencyAvailable(): Promise<boolean> {
  const encoding = parseAmountEncoding(prefs.getPrefs()?.amountEncoding);
  return (
    (await isFlagOn('currency')) &&
    (await isFlagOn('multicurrency')) &&
    !!encoding?.currencyCode &&
    isReviewedCurrency(encoding.currencyCode) &&
    encoding.currencyCode === (await getDefaultCurrencyCode())
  );
}

export type AccountCurrency = { currencyCode: string; precision: number };

/** Inherited accounts use the recorded budget encoding, never today's table. */
export async function getAccountCurrency(
  accountId: string,
): Promise<AccountCurrency> {
  const account = await db.first<{
    currency: string | null;
    currency_precision: number | null;
  }>('SELECT currency, currency_precision FROM accounts WHERE id = ?', [
    accountId,
  ]);
  if (!account) {
    throw new Error('account-not-found');
  }
  if (account.currency) {
    // The recorded precision, never today's currency table.
    if (account.currency_precision == null) {
      throw new Error('account-currency-precision-missing');
    }
    return {
      currencyCode: account.currency,
      precision: account.currency_precision,
    };
  }
  return {
    currencyCode: await getDefaultCurrencyCode(),
    precision: getRecordedAmountPrecision(),
  };
}

/**
 * Validates a requested account currency and returns the value to store:
 * undefined leaves it unchanged and NULL inherits the budget currency.
 */
export async function resolveAccountCurrencyInput(
  currency: unknown,
  accountId?: string,
): Promise<string | null | undefined> {
  if (currency === undefined) {
    return undefined;
  }
  // NULL and the budget currency (including the legacy '') mean inheritance.
  let value: string | null = null;
  if (currency !== null && currency !== (await getDefaultCurrencyCode())) {
    if (
      typeof currency !== 'string' ||
      !/^[A-Z]{3}$/.test(currency) ||
      !isReviewedCurrency(currency)
    ) {
      throw new Error('account-currency-invalid');
    }
    value = currency;
  }

  if (accountId) {
    const account = await db.first<{ currency: string | null }>(
      'SELECT currency FROM accounts WHERE id = ?',
      [accountId],
    );
    if (!account) {
      throw new Error('account-not-found');
    }
    // Tombstoned rows count: undo can restore them under the old currency.
    const hasTransactions = await db.first(
      'SELECT 1 FROM transactions WHERE acct = ? LIMIT 1',
      [accountId],
    );
    if ((account.currency ?? null) !== value) {
      if (hasTransactions) {
        throw new Error('account-currency-immutable');
      }
      // Schedule amounts and incoming transfers are recorded in the
      // account's encoding; correcting them waits for MC-7.
      // Account references may be a single id or a oneOf list, in
      // conditions or in account-setting actions.
      const accountReference = `(
        (json_type(x.value, '$.value') = 'array' AND EXISTS (
          SELECT 1 FROM json_each(x.value, '$.value') v WHERE v.value = ?))
        OR json_extract(x.value, '$.value') = ?
      )`;
      const hasSchedules = await db.first(
        `SELECT 1 FROM schedules s
           JOIN rules r ON r.id = s.rule, json_each(r.conditions) x
           WHERE s.tombstone = 0
             AND json_extract(x.value, '$.field') = 'acct'
             AND ${accountReference}
           LIMIT 1`,
        [accountId, accountId],
      );
      // Ordinary rules can link schedules too.
      const hasScheduleRules = await db.first(
        `SELECT 1 FROM rules r, json_each(r.actions) a
           WHERE r.tombstone = 0
             AND json_extract(a.value, '$.op') = 'link-schedule'
             AND EXISTS (
               SELECT 1 FROM (
                 SELECT value FROM json_each(r.conditions)
                 UNION ALL SELECT value FROM json_each(r.actions)
               ) x
               WHERE json_extract(x.value, '$.field') IN ('acct', 'account')
                 AND ${accountReference})
           LIMIT 1`,
        [accountId, accountId],
      );
      if (hasSchedules || hasScheduleRules) {
        throw new Error('account-currency-has-schedules');
      }
      // Tombstoned and merged (mapped) payee references count too.
      const hasTransfers = await db.first(
        `SELECT 1 FROM transactions t
           JOIN payees p ON p.id = COALESCE(
             (SELECT targetId FROM payee_mapping WHERE id = t.description),
             t.description)
           WHERE p.transfer_acct = ?
           LIMIT 1`,
        [accountId],
      );
      if (hasTransfers) {
        throw new Error('account-currency-has-transfers');
      }
    }
  }

  if (value !== null && !(await isMulticurrencyAvailable())) {
    throw new Error('multicurrency-unavailable');
  }
  return value;
}
