import * as db from '#server/db';
import { exchangeRateId } from '#server/exchange-rates/app';
import { exchangeRateModel } from '#server/models';
import { runMutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { exchangeRateSpec } from '#server/sync/coupled-cells';
import { addUtcDays } from '#shared/exchange-rate';

/**
 * Test fixture: a manual fallback for every day from `from` through `to`
 * (400 days by default), for tests that need one rate to hold over a span.
 * A later call for an overlapping span replaces those days.
 */
export async function saveDailyRates({
  quoteCurrency,
  rate,
  from,
  to = addUtcDays(from, 400),
}: {
  quoteCurrency: string;
  rate: string;
  from: string;
  to?: string;
}) {
  const baseCurrency =
    (
      await db.first<{ value: string }>(
        "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
      )
    )?.value ?? '';
  await runMutator(() =>
    batchMessages(async () => {
      for (let day = from; day <= to; day = addUtcDays(day, 1)) {
        const timestamp = `${day}T00:00:00.000Z`;
        const id = exchangeRateId(
          baseCurrency,
          quoteCurrency,
          'manual',
          'dated',
          timestamp,
        );
        const row = exchangeRateModel.validate({
          id,
          base_currency: baseCurrency,
          quote_currency: quoteCurrency,
          rate,
          kind: 'dated',
          source: 'manual',
          timestamp,
          tombstone: 0,
        });
        const spec = exchangeRateSpec(row);
        if (
          await db.first('SELECT id FROM exchange_rates WHERE id = ?', [id])
        ) {
          await db.update('exchange_rates', { id, rate, spec, tombstone: 0 });
        } else {
          await db.insert('exchange_rates', { ...row, spec });
        }
      }
    }),
  );
}
