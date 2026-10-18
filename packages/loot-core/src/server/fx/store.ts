import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import { compareRatePriority } from '#shared/fx/rates';
import type { ExchangeRateEntity } from '#types/models';

// Rates entered by the user, as opposed to ones fetched from a provider
export const MANUAL_SOURCE = 'manual';

export type ValidExchangeRate = Pick<
  ExchangeRateEntity,
  'from_currency' | 'to_currency' | 'rate' | 'date'
>;

export type ExchangeRatesUpsertResult = {
  // New rates
  added: number;
  // Rates whose value changed
  updated: number;
  // Rates that were already saved with the same value
  unchanged: number;
};

export function toEntity(row: db.DbExchangeRate): ExchangeRateEntity {
  return {
    id: row.id,
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    rate: row.rate,
    date: db.fromDateRepr(row.date),
    source: row.source,
    created_at: row.created_at ?? null,
  };
}

export async function getExchangeRates(): Promise<ExchangeRateEntity[]> {
  const rows = await db.getExchangeRates();
  return rows.map(toEntity);
}

export function getRateKey({
  from_currency,
  to_currency,
  date,
}: Pick<ExchangeRateEntity, 'from_currency' | 'to_currency' | 'date'>) {
  return `${from_currency}>${to_currency}>${date}`;
}

// Saves validated rates from `source`: a rate for a pair and date that
// already has one from the same source is replaced, and so is an earlier
// rate in `rates` for the same pair and date, so rates of another source
// are never touched. Everything is written as a single batch, so the
// budget and totals are recalculated once rather than after every row.
export async function upsertExchangeRates(
  rates: Iterable<ValidExchangeRate>,
  source: string,
): Promise<ExchangeRatesUpsertResult> {
  const newRates = new Map<string, ValidExchangeRate>();
  for (const rate of rates) {
    newRates.set(getRateKey(rate), rate);
  }

  // Of duplicates synced from different devices, the rate every other
  // lookup uses is the one updated
  const savedRates = new Map<string, ExchangeRateEntity>();
  for (const rate of await getExchangeRates()) {
    const key = getRateKey(rate);
    const current = savedRates.get(key);
    if (
      rate.source === source &&
      (!current || compareRatePriority(rate, current) > 0)
    ) {
      savedRates.set(key, rate);
    }
  }

  const result = { added: 0, updated: 0, unchanged: 0 };
  await batchMessages(async () => {
    for (const [key, rate] of newRates) {
      const saved = savedRates.get(key);
      if (!saved) {
        await db.insertExchangeRate({
          from_currency: rate.from_currency,
          to_currency: rate.to_currency,
          rate: rate.rate,
          date: db.toDateRepr(rate.date),
          source,
          created_at: Date.now(),
        });
        result.added += 1;
      } else if (saved.rate !== rate.rate) {
        await db.updateExchangeRate({ id: saved.id, rate: rate.rate });
        result.updated += 1;
      } else {
        result.unchanged += 1;
      }
    }
  });
  return result;
}
