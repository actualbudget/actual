import * as fs from '#platform/server/fs';
import { createApp } from '#server/app';
import * as db from '#server/db';
import { ValidationError } from '#server/errors';
import { exchangeRateModel } from '#server/models';
import { mutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
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

export type ExchangeRatesHandlers = {
  'exchange-rates-get': typeof getExchangeRates;
  'exchange-rate-create': typeof createExchangeRate;
  'exchange-rate-update': typeof updateExchangeRate;
  'exchange-rate-delete': typeof deleteExchangeRate;
  'exchange-rates-delete': typeof deleteExchangeRates;
  'exchange-rates-import': typeof importExchangeRates;
  'exchange-rates-export': typeof exportExchangeRates;
};

export const app = createApp<ExchangeRatesHandlers>();
app.method('exchange-rates-get', getExchangeRates);
app.method('exchange-rate-create', mutator(undoable(createExchangeRate)));
app.method('exchange-rate-update', mutator(undoable(updateExchangeRate)));
app.method('exchange-rate-delete', mutator(undoable(deleteExchangeRate)));
app.method('exchange-rates-delete', mutator(undoable(deleteExchangeRates)));
app.method('exchange-rates-import', mutator(undoable(importExchangeRates)));
app.method('exchange-rates-export', exportExchangeRates);

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

  // A pair has one rate per date and source; moving a rate onto a taken
  // date would leave two of them. Only a move is checked, so the value of
  // a duplicate synced from another device can still be edited.
  const isMoved =
    updated.from_currency !== current.from_currency ||
    updated.to_currency !== current.to_currency ||
    updated.date !== current.date;
  const clash =
    isMoved &&
    (await db.findExchangeRate({
      from_currency: updated.from_currency,
      to_currency: updated.to_currency,
      date: db.toDateRepr(updated.date),
      source: existing.source,
    }));
  if (clash && clash.id !== id) {
    throw new ValidationError(
      `There is already a ${updated.from_currency} → ${updated.to_currency} rate on ${updated.date}`,
    );
  }

  await db.updateExchangeRate({
    id,
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
