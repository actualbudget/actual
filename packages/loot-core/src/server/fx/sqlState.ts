import * as db from '#server/db';
import { isSupportedCurrencyCode } from '#shared/fx/currency';
import { setSqlConversionState } from '#shared/fx/sql';

const PREFERENCE_IDS = [
  'flags.currency',
  'flags.multiCurrency',
  'defaultCurrencyCode',
  'currency-conversion-rate',
];

// Synchronous so it can run straight after a change is applied, before any
// query reads converted amounts
function readSqlConversionState() {
  const preferences = new Map(
    db
      .runQuery<Pick<db.DbPreference, 'id' | 'value'>>(
        `SELECT id, value FROM preferences WHERE id IN (${PREFERENCE_IDS.map(() => '?').join(', ')})`,
        PREFERENCE_IDS,
        true,
      )
      .map(({ id, value }) => [id, value]),
  );
  // Changes sync column by column, so a row can arrive partly written; one
  // without its currencies, rate or date is skipped rather than failing
  // every change applied after it
  const rates = db.runQuery<db.DbExchangeRate>(
    `SELECT id, from_currency, to_currency, rate, date, source, created_at
       FROM exchange_rates
      WHERE tombstone = 0
        AND from_currency IS NOT NULL
        AND to_currency IS NOT NULL
        AND date IS NOT NULL
        AND rate > 0`,
    [],
    true,
  );
  const defaultCurrencyCode = preferences.get('defaultCurrencyCode') ?? '';

  setSqlConversionState({
    // Multiple currencies stay off with a default currency they don't
    // support
    enabled:
      preferences.get('flags.currency') === 'true' &&
      preferences.get('flags.multiCurrency') === 'true' &&
      isSupportedCurrencyCode(defaultCurrencyCode),
    defaultCurrencyCode,
    rateMode:
      preferences.get('currency-conversion-rate') === 'historical'
        ? 'historical'
        : 'latest',
    rates: rates.map(rate => ({
      ...rate,
      date: db.fromDateRepr(rate.date),
    })),
  });
}

// Loads the rates and settings the FX_CONVERT SQL functions use
export const loadSqlConversionState = readSqlConversionState;

// Called with every applied change, local or synced, before the budget and
// any query reacts to it
export function updateSqlConversionState(changedTables: Map<string, unknown>) {
  // Rows of each changed table, keyed by id
  const changedPreferences = changedTables.get('preferences') as
    | Map<string, unknown>
    | undefined;
  if (
    changedTables.has('exchange_rates') ||
    [...(changedPreferences?.keys() ?? [])].some(id =>
      PREFERENCE_IDS.includes(id),
    )
  ) {
    readSqlConversionState();
  }
}
