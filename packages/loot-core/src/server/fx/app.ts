import * as fs from '#platform/server/fs';
import { logger } from '#platform/server/log';
import { createApp } from '#server/app';
import * as db from '#server/db';
import { ValidationError } from '#server/errors';
import { exchangeRateModel } from '#server/models';
import { mutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import { isSqlConversionEnabled } from '#shared/fx/sql';
import { currentDay, dayFromDate } from '#shared/months';
import type { ExchangeRateEntity } from '#types/models';

import { formatExchangeRatesCsv, parseExchangeRatesCsv } from './import';
import type { ExchangeRateImportError } from './import';
import {
  getExchangeRates,
  MANUAL_SOURCE,
  toEntity,
  upsertExchangeRates,
} from './store';
import type { ExchangeRatesUpsertResult, ValidExchangeRate } from './store';
import { findMissingExchangeRates, updateExchangeRates } from './update';
import type { ExchangeRatesUpdateResult, MissingExchangeRates } from './update';

export type ExchangeRatesHandlers = {
  'exchange-rates-get': typeof getExchangeRates;
  'exchange-rate-create': typeof createExchangeRate;
  'exchange-rate-update': typeof updateExchangeRate;
  'exchange-rate-delete': typeof deleteExchangeRate;
  'exchange-rates-delete': typeof deleteExchangeRates;
  'exchange-rates-import': typeof importExchangeRates;
  'exchange-rates-export': typeof exportExchangeRates;
  'exchange-rates-update': typeof updateExchangeRatesNow;
  'exchange-rates-update-status': typeof getUpdateStatus;
  'exchange-rates-missing': typeof findMissingExchangeRates;
  'exchange-rates-check': typeof checkExchangeRates;
};

export const app = createApp<ExchangeRatesHandlers>();
app.method('exchange-rates-get', getExchangeRates);
app.method('exchange-rate-create', mutator(undoable(createExchangeRate)));
app.method('exchange-rate-update', mutator(undoable(updateExchangeRate)));
app.method('exchange-rate-delete', mutator(undoable(deleteExchangeRate)));
app.method('exchange-rates-delete', mutator(undoable(deleteExchangeRates)));
app.method('exchange-rates-import', mutator(undoable(importExchangeRates)));
app.method('exchange-rates-export', exportExchangeRates);
// Not a mutator: the requests would hold up every edit, so only saving the
// rates is queued (see `updateExchangeRates`). Fetched rates aren't
// undoable either: undoing an update would only bring the missing days back.
app.method('exchange-rates-update', updateExchangeRatesNow);
app.method('exchange-rates-update-status', getUpdateStatus);
app.method('exchange-rates-missing', findMissingExchangeRates);
app.method('exchange-rates-check', checkExchangeRates);

app.events.on('sync', ({ type }) => {
  if (type === 'success' && prefs.getPrefs() && db.getDatabase()) {
    void updateExchangeRatesDaily();
  }
});

type NewExchangeRate = Pick<
  ExchangeRateEntity,
  'from_currency' | 'to_currency' | 'rate' | 'date'
> &
  Partial<Pick<ExchangeRateEntity, 'source'>>;

// Saving a rate for a pair, date and source that already has one
// replaces its value instead of adding a duplicate.
async function createExchangeRate(
  exchangeRate: NewExchangeRate,
): Promise<ExchangeRateEntity['id']> {
  const { from_currency, to_currency, rate, date } =
    exchangeRateModel.validate(exchangeRate);
  const source = exchangeRate.source || MANUAL_SOURCE;
  const dateRepr = db.toDateRepr(date);

  const existing = await db.findExchangeRate({
    from_currency,
    to_currency,
    date: dateRepr,
    source,
  });
  if (existing) {
    await db.updateExchangeRate({ id: existing.id, rate });
    return existing.id;
  }

  return db.insertExchangeRate({
    from_currency,
    to_currency,
    rate,
    date: dateRepr,
    source,
    created_at: Date.now(),
  });
}

async function updateExchangeRate({
  id,
  ...fields
}: Pick<ExchangeRateEntity, 'id'> &
  Partial<
    Pick<ExchangeRateEntity, 'from_currency' | 'to_currency' | 'rate' | 'date'>
  >): Promise<void> {
  const existing = await db.getExchangeRate(id);
  if (!existing) {
    throw new Error(`Exchange rate ${id} does not exist`);
  }

  const current = toEntity(existing);
  const updated = exchangeRateModel.validate({ ...current, ...fields });

  // Editing a fetched rate makes it the user's own: their correction then
  // always wins, and later updates from the provider leave it alone
  const becomesManual = existing.source !== MANUAL_SOURCE;

  // A pair has one rate per date and source; moving a rate onto a taken
  // date would leave two of them. Only a move or a fetched rate becoming
  // manual is checked, so the value of a duplicate synced from another
  // device can still be edited.
  const isMoved =
    updated.from_currency !== current.from_currency ||
    updated.to_currency !== current.to_currency ||
    updated.date !== current.date;
  const clash =
    (isMoved || becomesManual) &&
    (await db.findExchangeRate({
      from_currency: updated.from_currency,
      to_currency: updated.to_currency,
      date: db.toDateRepr(updated.date),
      source: MANUAL_SOURCE,
    }));
  if (clash && clash.id !== id) {
    if (!isMoved) {
      // The user already has their own rate for that day, which is the one
      // every lookup uses: change it instead
      await db.updateExchangeRate({ id: clash.id, rate: updated.rate });
      return;
    }
    throw new ValidationError(
      `There is already a ${updated.from_currency} → ${updated.to_currency} rate on ${updated.date}`,
    );
  }

  await db.updateExchangeRate({
    id,
    ...(becomesManual && { source: MANUAL_SOURCE }),
    ...(fields.from_currency !== undefined && {
      from_currency: fields.from_currency,
    }),
    ...(fields.to_currency !== undefined && {
      to_currency: fields.to_currency,
    }),
    ...(fields.rate !== undefined && { rate: fields.rate }),
    ...(fields.date !== undefined && { date: db.toDateRepr(fields.date) }),
  });
}

async function deleteExchangeRate({
  id,
}: Pick<ExchangeRateEntity, 'id'>): Promise<ExchangeRateEntity['id']> {
  await db.deleteExchangeRate({ id });
  return id;
}

// Deletes many rates as a single change, so the budget and totals are
// recalculated once
async function deleteExchangeRates({
  ids,
}: {
  ids: Array<ExchangeRateEntity['id']>;
}): Promise<void> {
  await batchMessages(async () => {
    for (const id of ids) {
      await db.deleteExchangeRate({ id });
    }
  });
}

export type ExchangeRatesImportResult = ExchangeRatesUpsertResult & {
  errors: ExchangeRateImportError[];
};

// Imports manual rates from a CSV file (see `parseExchangeRatesCsv`). A rate
// for a pair and date that already exists is replaced, and so is an earlier
// row of the file for the same pair and date. Rows that can't be read or
// saved are reported and skipped.
async function importExchangeRates({
  filepath,
}: {
  filepath: string;
}): Promise<ExchangeRatesImportResult> {
  let contents: string;
  try {
    contents = await fs.readFile(filepath, 'utf8');
  } catch (err) {
    return {
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: [
        {
          line: 0,
          message: `Could not open the file: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }

  const { rates, errors } = parseExchangeRatesCsv(contents);
  // A later row of the file for the same pair and date replaces an
  // earlier one (see `upsertExchangeRates`)
  const validRates: ValidExchangeRate[] = [];
  for (const { line, ...rate } of rates) {
    try {
      validRates.push(exchangeRateModel.validate(rate));
    } catch (err) {
      errors.push({
        line,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const result = await upsertExchangeRates(validRates, MANUAL_SOURCE);

  errors.sort((a, b) => a.line - b.line);
  return { ...result, errors };
}

// All rates as a CSV file that the import reads back
async function exportExchangeRates(): Promise<string> {
  const rates = await getExchangeRates();
  return formatExchangeRatesCsv(rates);
}

export type ExchangeRatesUpdateStatus = ExchangeRatesUpdateResult & {
  // When the update ran, as an ISO timestamp
  time: string;
};

let runningUpdate: {
  budgetId: string | undefined;
  promise: Promise<ExchangeRatesUpdateStatus>;
} | null = null;

// Remembers the outcome on this device for the Exchange Rates page
async function updateAndSaveStatus(
  budgetId: string | undefined,
): Promise<ExchangeRatesUpdateStatus> {
  const status = {
    ...(await updateExchangeRates()),
    time: new Date().toISOString(),
  };
  // Not for another budget opened during the update. An update that worked,
  // automatic or not, is the day's, so syncs don't fetch again until
  // tomorrow.
  const current = prefs.getPrefs();
  if (current && current.id === budgetId) {
    await prefs.savePrefs({
      exchangeRatesUpdateStatus: JSON.stringify(status),
      ...(status.errors.length === 0 && {
        lastExchangeRateUpdate: currentDay(),
      }),
    });
  }
  return status;
}

// Fetches the missing rates once at a time per budget
function runUpdate(): Promise<ExchangeRatesUpdateStatus> {
  const budgetId = prefs.getPrefs()?.id;
  if (runningUpdate !== null && runningUpdate.budgetId === budgetId) {
    return runningUpdate.promise;
  }
  const run = { budgetId, promise: updateAndSaveStatus(budgetId) };
  runningUpdate = run;
  const clear = () => {
    if (runningUpdate === run) {
      runningUpdate = null;
    }
  };
  void run.promise.then(clear, clear);
  return run.promise;
}

// The "Update now" button: runs even when automatic updates are off
async function updateExchangeRatesNow(): Promise<ExchangeRatesUpdateStatus> {
  return runUpdate();
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every(entry => typeof entry === 'string')
  );
}

function isUpdateStatus(value: unknown): value is ExchangeRatesUpdateStatus {
  return (
    typeof value === 'object' &&
    value !== null &&
    'time' in value &&
    typeof value.time === 'string' &&
    'added' in value &&
    typeof value.added === 'number' &&
    'updated' in value &&
    typeof value.updated === 'number' &&
    'unchanged' in value &&
    typeof value.unchanged === 'number' &&
    'unsupported' in value &&
    isStringList(value.unsupported) &&
    'errors' in value &&
    isStringList(value.errors)
  );
}

async function getUpdateStatus(): Promise<ExchangeRatesUpdateStatus | null> {
  const status = prefs.getPrefs()?.exchangeRatesUpdateStatus;
  if (!status) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(status);
    return isUpdateStatus(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function isAutoUpdateOn() {
  const row = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['exchange-rates-auto-update'],
  );
  return row?.value === 'true';
}

// After an update failed, e.g. offline, how long until syncs try again
const RETRY_AFTER_MS = 60 * 60 * 1000;

let lastFailure: { budgetId: string | undefined; time: number } | null = null;

// Once a day, when a budget opens or syncs, if the user turned automatic
// updates on. A day only counts as done when nothing failed, so a failed
// update is tried again on a later sync, at most once an hour.
export async function updateExchangeRatesDaily() {
  const budgetId = prefs.getPrefs()?.id;
  if (
    !isSqlConversionEnabled() ||
    prefs.getPrefs()?.lastExchangeRateUpdate === currentDay() ||
    (lastFailure !== null &&
      lastFailure.budgetId === budgetId &&
      Date.now() - lastFailure.time < RETRY_AFTER_MS) ||
    !(await isAutoUpdateOn())
  ) {
    return;
  }

  try {
    const status = await runUpdate();
    lastFailure =
      status.errors.length === 0 ? null : { budgetId, time: Date.now() };
  } catch (err) {
    lastFailure = { budgetId, time: Date.now() };
    logger.warn('Could not update exchange rates', err);
  }
}

export type ExchangeRatesCheck = {
  missing: MissingExchangeRates[];
  // Why the last automatic update failed, when it did
  errors: string[];
  unsupported: string[];
};

// What to remind the user of when a budget opens: missing rates, unless
// automatic updates are on and today's update worked, since they fill
// themselves in. An update still running is waited for, so the answer
// reflects it; none is started, as the budget's first sync starts it once
// other devices' rates have arrived. An earlier day's failure isn't
// reported, as today's update may still fix it.
async function checkExchangeRates(): Promise<ExchangeRatesCheck | null> {
  if (!isSqlConversionEnabled()) {
    return null;
  }
  const isAutomatic = await isAutoUpdateOn();
  const running = runningUpdate;
  if (
    isAutomatic &&
    running !== null &&
    running.budgetId === prefs.getPrefs()?.id
  ) {
    await running.promise.catch(() => null);
  }
  const missing = await findMissingExchangeRates();
  if (missing.length === 0) {
    return null;
  }
  if (!isAutomatic) {
    return { missing, errors: [], unsupported: [] };
  }
  const status = await getUpdateStatus();
  if (
    !status ||
    dayFromDate(new Date(status.time)) !== currentDay() ||
    (status.errors.length === 0 && status.unsupported.length === 0)
  ) {
    return null;
  }
  return { missing, errors: status.errors, unsupported: status.unsupported };
}
