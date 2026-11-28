import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import { applyMessages, setSyncingMode } from '#server/sync';
import { exchangeRateSpec } from '#server/sync/coupled-cells';
import { undo } from '#server/undo';
import type { ExchangeRateEntity } from '#types/models';

import { exchangeRateId, writeFetchedRate, writeManualRate } from './app';

const args = {
  baseCurrency: 'USD',
  quoteCurrency: 'EUR',
  providerId: 'fxtest',
  rate: '0.92',
  effectiveDate: '2026-03-11',
};
const id = exchangeRateId(
  'USD',
  'EUR',
  'plugin:fxtest',
  'fetched',
  '2026-03-11T00:00:00.000Z',
);
async function row() {
  return db.first<ExchangeRateEntity>(
    'SELECT * FROM exchange_rates WHERE id = ?',
    [id],
  );
}
beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
});

it('writes the exact provider rate with its deterministic key and coupled spec', async () => {
  expect(await runMutator(() => writeFetchedRate(args))).toBe('inserted');
  const saved = await row();
  expect(saved).toMatchObject({
    id,
    base_currency: 'USD',
    quote_currency: 'EUR',
    rate: '0.92',
    kind: 'fetched',
    source: 'plugin:fxtest',
    timestamp: '2026-03-11T00:00:00.000Z',
    tombstone: 0,
  });
  if (!saved) throw new Error('fetched row missing');
  expect(saved.spec).toBe(exchangeRateSpec(saved));
  expect(
    await runMutator(() => writeFetchedRate({ ...args, rate: '0.93' })),
  ).toBe('existing');
  expect((await row())?.rate).toBe('0.92');
});

it('restores a deleted fetched row of the same key, but never a manual one', async () => {
  await runMutator(() => writeFetchedRate(args));
  await db.update('exchange_rates', { id, tombstone: 1 });
  expect(
    await runMutator(() => writeFetchedRate({ ...args, rate: '0.94' })),
  ).toBe('inserted');
  expect(await row()).toMatchObject({ rate: '0.94', tombstone: 0 });
  expect(await runMutator(() => writeFetchedRate(args))).toBe('existing');

  const manualId = exchangeRateId(
    'USD',
    'EUR',
    'manual',
    'dated',
    '2026-03-11T00:00:00.000Z',
  );
  await runMutator(() =>
    writeManualRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.95',
      timestamp: '2026-03-11T00:00:00.000Z',
    }),
  );
  await db.update('exchange_rates', { id: manualId, tombstone: 1 });
  await runMutator(() => writeFetchedRate(args));
  expect(
    (
      await db.first<ExchangeRateEntity>(
        'SELECT * FROM exchange_rates WHERE id = ?',
        [manualId],
      )
    )?.tombstone,
  ).toBe(1);
});

it('keeps an already-live newer row when an old response arrives', async () => {
  await runMutator(() => writeFetchedRate({ ...args, rate: '0.93' }));
  expect(await runMutator(() => writeFetchedRate(args))).toBe('existing');
  expect((await row())?.rate).toBe('0.93');
});

it('does not enter the undo stack or change a manual rate', async () => {
  await runMutator(() =>
    writeManualRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.95',
      timestamp: '2026-03-11T00:00:00.000Z',
    }),
  );
  await runMutator(() => writeFetchedRate(args));
  await undo();
  expect(await row()).toMatchObject({ rate: '0.92', tombstone: 0 });
  expect(
    db.firstSync<{ count: number }>(
      "SELECT count(*) AS count FROM exchange_rates WHERE source = 'manual' AND tombstone = 0",
    )?.count,
  ).toBe(0);
});

it('converges a later synced fetched value onto the same deterministic row', async () => {
  await runMutator(() => writeFetchedRate(args));
  setSyncingMode('enabled');
  onTestFinished(() => {
    setSyncingMode('disabled');
  });
  const fields: Array<[string, string | number]> = [
    ['base_currency', 'USD'],
    ['quote_currency', 'EUR'],
    ['rate', '0.93'],
    ['kind', 'fetched'],
    ['source', 'plugin:fxtest'],
    ['timestamp', '2026-03-11T00:00:00.000Z'],
    ['spec', '{"rate":"0.93","kind":"fetched"}'],
    ['tombstone', 0],
  ];
  await applyMessages(
    fields.map(([column, value], n) => {
      const timestamp = Timestamp.parse(
        `${new Date(Date.now() + 60000 + n).toISOString()}-0000-abcdef0123456789`,
      );
      if (!timestamp) throw new Error('test timestamp unavailable');
      return { dataset: 'exchange_rates', row: id, column, value, timestamp };
    }),
  );
  expect(await row()).toMatchObject({
    id,
    rate: '0.93',
    source: 'plugin:fxtest',
  });
  expect(
    db.firstSync<{ count: number }>(
      'SELECT count(*) AS count FROM exchange_rates',
    )?.count,
  ).toBe(1);
  expect(await runMutator(() => writeFetchedRate(args))).toBe('existing');
  expect((await row())?.rate).toBe('0.93');
});
