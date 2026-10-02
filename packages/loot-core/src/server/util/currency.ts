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
  const account = await db.first<{ currency: string | null }>(
    'SELECT currency FROM accounts WHERE id = ?',
    [accountId],
  );
  if (!account) {
    throw new Error('account-not-found');
  }
  if (account.currency) {
    // Explicit account currencies become storable with foreign posting.
    throw new Error('account-currency-foreign-unavailable');
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
  if (currency === undefined || currency === null) {
    return currency === undefined ? undefined : null;
  }
  // The budget currency always means inheritance, including the legacy ''.
  const isBudgetCurrency = currency === (await getDefaultCurrencyCode());
  if (
    !isBudgetCurrency &&
    (typeof currency !== 'string' ||
      !/^[A-Z]{3}$/.test(currency) ||
      !isReviewedCurrency(currency))
  ) {
    throw new Error('account-currency-invalid');
  }
  const value = isBudgetCurrency ? null : currency;

  if (accountId) {
    const account = await db.first<{ currency: string | null }>(
      'SELECT currency FROM accounts WHERE id = ?',
      [accountId],
    );
    if (!account) {
      throw new Error('account-not-found');
    }
    const hasTransactions = await db.first(
      'SELECT 1 FROM transactions WHERE acct = ? AND tombstone = 0 LIMIT 1',
      [accountId],
    );
    if ((account.currency ?? null) !== value && hasTransactions) {
      throw new Error('account-currency-immutable');
    }
  }

  if (value !== null) {
    throw new Error(
      (await isMulticurrencyAvailable())
        ? 'account-currency-foreign-unavailable'
        : 'multicurrency-unavailable',
    );
  }
  return value;
}
