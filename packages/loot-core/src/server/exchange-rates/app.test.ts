import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { exchangeRateModel } from '#server/models';
import * as prefs from '#server/prefs';
import { applyMessages, setSyncingMode } from '#server/sync';
import { redo, undo } from '#server/undo';

import { app, exchangeRateId, resolveRate } from './app';

const save = app.handlers['exchange-rates/save'];
const remove = app.handlers['exchange-rates/remove'];
const capture = app.handlers['exchange-rates/capture-entry'];
const resolve = app.handlers['exchange-rates/resolve'];

async function setBudget(
  currencyCode: string,
  precision: number,
  { flags = true } = {},
) {
  await db.update('preferences', {
    id: 'defaultCurrencyCode',
    value: currencyCode,
  });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({ version: 1, currencyCode, precision }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', {
      id: `flags.${flag}`,
      value: String(flags),
    });
  }
}

async function insertRate(row: {
  quote?: string;
  rate: string;
  kind: 'dated' | 'standing' | 'fetched';
  source?: string;
  timestamp: string;
}) {
  const source = row.source ?? (row.kind === 'fetched' ? 'provider' : 'manual');
  const quote = row.quote ?? 'JPY';
  await db.insert('exchange_rates', {
    id: exchangeRateId('USD', quote, source, row.kind, row.timestamp),
    base_currency: 'USD',
    quote_currency: quote,
    rate: row.rate,
    kind: row.kind,
    source,
    timestamp: row.timestamp,
    tombstone: 0,
  });
}

function liveRows() {
  return db.runQuery<{ id: string; rate: string; kind: string }>(
    'SELECT id, rate, kind FROM exchange_rates WHERE tombstone = 0 ORDER BY timestamp, kind',
    [],
    true,
  );
}

async function resolveOn(date: string, { forEntry = false } = {}) {
  return resolveRate({
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    date,
    forEntry,
  });
}

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await setBudget('USD', 2);
});

describe('resolver hierarchy', () => {
  it('prefers explicit, then the day rate for entry, then fetched rates, then standing', async () => {
    await insertRate({
      rate: '140',
      kind: 'standing',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await insertRate({
      rate: '149',
      kind: 'fetched',
      timestamp: '2026-03-08T12:00:00.000Z',
    });
    // A fetched rate from the last seven days outranks a standing rate.
    expect(await resolveOn('2026-03-10')).toMatchObject({
      rate: '149',
      kind: 'fetched',
      fallback: true,
    });
    expect(await resolveOn('2026-03-10', { forEntry: true })).toMatchObject({
      rate: '149',
      kind: 'fetched',
      fallback: true,
    });

    await insertRate({
      rate: '150',
      kind: 'fetched',
      timestamp: '2026-03-10T06:00:00.000Z',
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({
      rate: '150',
      kind: 'fetched',
      fallback: false,
    });

    await insertRate({
      rate: '155',
      kind: 'dated',
      timestamp: '2026-03-10T00:00:00.000Z',
    });
    // Estimates and valuation skip the one-day rate.
    expect(await resolveOn('2026-03-10')).toMatchObject({
      rate: '150',
      kind: 'fetched',
    });
    expect(await resolveOn('2026-03-10', { forEntry: true })).toMatchObject({
      rate: '155',
      kind: 'dated',
      fallback: false,
    });

    expect(
      await resolveRate({
        baseCurrency: 'USD',
        quoteCurrency: 'JPY',
        date: '2026-03-10',
        explicitRate: '160',
        forEntry: true,
      }),
    ).toMatchObject({ rate: '160', kind: 'explicit' });
  });

  it('uses the latest timestamp on the same day', async () => {
    await insertRate({
      rate: '150',
      kind: 'fetched',
      timestamp: '2026-03-10T06:00:00.000Z',
    });
    await insertRate({
      rate: '151',
      kind: 'fetched',
      timestamp: '2026-03-10T18:00:00.000Z',
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({ rate: '151' });
  });

  it('breaks timestamp ties deterministically', async () => {
    const timestamp = '2026-03-10T06:00:00.000Z';
    await insertRate({
      rate: '152',
      kind: 'fetched',
      source: 'zeta',
      timestamp,
    });
    await insertRate({
      rate: '151',
      kind: 'fetched',
      source: 'alpha',
      timestamp,
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({
      rate: '151',
      source: 'alpha',
    });
  });

  it('applies a one-day rate only on that UTC day, and only for entry', async () => {
    await insertRate({
      rate: '148',
      kind: 'dated',
      timestamp: '2026-03-01T00:00:00.000Z',
    });
    expect(await resolveOn('2026-02-28', { forEntry: true })).toEqual({
      status: 'unavailable',
    });
    expect(await resolveOn('2026-03-01', { forEntry: true })).toMatchObject({
      rate: '148',
      kind: 'dated',
    });
    expect(await resolveOn('2026-03-01')).toEqual({ status: 'unavailable' });
    expect(await resolveOn('2026-03-02', { forEntry: true })).toEqual({
      status: 'unavailable',
    });
  });

  it('keeps standing rates effective until superseded', async () => {
    await insertRate({
      rate: '140',
      kind: 'standing',
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    await insertRate({
      rate: '145',
      kind: 'standing',
      timestamp: '2026-03-01T00:00:00.000Z',
    });
    expect(await resolveOn('2024-12-31')).toEqual({ status: 'unavailable' });
    expect(await resolveOn('2025-06-01')).toMatchObject({ rate: '140' });
    expect(await resolveOn('2026-03-01')).toMatchObject({ rate: '145' });
    expect(await resolveOn('2030-01-01')).toMatchObject({ rate: '145' });
  });

  it('rejects stale and future fetched rates', async () => {
    await insertRate({
      rate: '149',
      kind: 'fetched',
      timestamp: '2026-03-02T23:59:59.000Z',
    });
    await insertRate({
      rate: '170',
      kind: 'fetched',
      timestamp: '2026-03-11T00:00:00.000Z',
    });
    // 2026-03-02 is eight days before 2026-03-10.
    expect(await resolveOn('2026-03-10')).toEqual({ status: 'unavailable' });
    expect(await resolveOn('2026-03-09')).toMatchObject({
      rate: '149',
      fallback: true,
    });

    await insertRate({
      rate: '140',
      kind: 'standing',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({
      rate: '140',
      kind: 'standing',
      fallback: false,
    });
  });

  it('uses UTC day boundaries', async () => {
    await insertRate({
      rate: '150',
      kind: 'fetched',
      timestamp: '2026-03-09T23:59:59.999Z',
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({ fallback: true });
    await insertRate({
      rate: '151',
      kind: 'fetched',
      timestamp: '2026-03-10T00:00:00.000Z',
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({
      rate: '151',
      fallback: false,
    });
  });

  it('ignores synced rows that are not in canonical form', async () => {
    await insertRate({
      rate: '150',
      kind: 'fetched',
      timestamp: '2026-03-10T06:00:00.500Z',
    });
    // A non-canonical timestamp would sort after the canonical one as text.
    await db.insert('exchange_rates', {
      id: 'synced-bad',
      base_currency: 'USD',
      quote_currency: 'JPY',
      rate: '149',
      kind: 'fetched',
      source: 'provider',
      timestamp: '2026-03-10T06:00:00Z',
      tombstone: 0,
    });
    await db.insert('exchange_rates', {
      id: 'synced-bad-rate',
      base_currency: 'USD',
      quote_currency: 'JPY',
      rate: '1e3',
      kind: 'fetched',
      source: 'provider',
      timestamp: '2026-03-10T07:00:00.000Z',
      tombstone: 0,
    });
    expect(await resolveOn('2026-03-10')).toMatchObject({ rate: '150' });
  });

  it('saves and resolves the last supported date', async () => {
    await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '9999-12-31',
    });
    await expect(
      resolve({ quoteCurrency: 'JPY', date: '9999-12-31' }),
    ).resolves.toMatchObject({ rate: '150' });
  });

  it('never invents a rate', async () => {
    expect(await resolveOn('2026-03-10')).toEqual({ status: 'unavailable' });
    await expect(
      resolveRate({
        baseCurrency: 'USD',
        quoteCurrency: 'USD',
        date: '2026-03-10',
      }),
    ).rejects.toThrow('rate-same-currency');
  });

  it('exposes the resolver through a gated handler', async () => {
    await insertRate({
      rate: '150',
      kind: 'standing',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await expect(
      resolve({ quoteCurrency: 'JPY', date: '2026-03-10' }),
    ).resolves.toMatchObject({ rate: '150' });
    await expect(
      resolve({ quoteCurrency: 'USD', date: '2026-03-10' }),
    ).rejects.toThrow('rate-same-currency');
    await expect(
      resolve({ quoteCurrency: 'CLF', date: '2026-03-10' }),
    ).rejects.toThrow('rate-currency-invalid');
    await expect(
      resolve({ quoteCurrency: 'JPY', date: '2026-02-30' }),
    ).rejects.toThrow('date-invalid');

    await insertRate({
      rate: '155',
      kind: 'dated',
      timestamp: '2026-03-10T00:00:00.000Z',
    });
    await expect(
      resolve({ quoteCurrency: 'JPY', date: '2026-03-10' }),
    ).resolves.toMatchObject({ rate: '155', kind: 'dated' });
    await expect(
      resolve({ quoteCurrency: 'JPY', date: '2026-03-10', forEntry: false }),
    ).resolves.toMatchObject({ rate: '150', kind: 'standing' });
  });
});

describe('saving rates', () => {
  it('saves one-day and standing rates at midnight UTC', async () => {
    await save({
      quoteCurrency: 'JPY',
      rate: '150.50',
      kind: 'dated',
      date: '2026-03-10',
    });
    await save({
      quoteCurrency: 'KWD',
      rate: '0.307',
      kind: 'dated',
      date: '2026-03-01',
    });
    await save({
      quoteCurrency: 'EUR',
      rate: 0.9,
      kind: 'standing',
      date: '2026-01-01',
    });
    expect(
      db.runQuery(
        'SELECT quote_currency, rate, kind, source, timestamp FROM exchange_rates ORDER BY quote_currency',
        [],
        true,
      ),
    ).toEqual([
      {
        quote_currency: 'EUR',
        rate: '0.9',
        kind: 'standing',
        source: 'manual',
        timestamp: '2026-01-01T00:00:00.000Z',
      },
      {
        quote_currency: 'JPY',
        rate: '150.5',
        kind: 'dated',
        source: 'manual',
        timestamp: '2026-03-10T00:00:00.000Z',
      },
      {
        quote_currency: 'KWD',
        rate: '0.307',
        kind: 'dated',
        source: 'manual',
        timestamp: '2026-03-01T00:00:00.000Z',
      },
    ]);
  });

  it('stores a one-day rate and a standing rate on the same day', async () => {
    await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'standing',
      date: '2026-03-10',
    });
    await save({
      quoteCurrency: 'JPY',
      rate: '155',
      kind: 'dated',
      date: '2026-03-10',
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '155', kind: 'dated' }),
      expect.objectContaining({ rate: '150', kind: 'standing' }),
    ]);
  });

  it('requires confirmation to replace a duplicate of the same kind', async () => {
    const first = await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    });
    const duplicate = await save({
      quoteCurrency: 'JPY',
      rate: '155',
      kind: 'dated',
      date: '2026-03-10',
    });
    expect(duplicate).toMatchObject({
      status: 'duplicate',
      existing: { rate: '150', kind: 'dated' },
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
    ]);

    const replaced = await save({
      quoteCurrency: 'JPY',
      rate: '155',
      kind: 'dated',
      date: '2026-03-10',
      replace: true,
    });
    expect(replaced).toEqual(first);
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '155', kind: 'dated' }),
    ]);
  });

  it('revives a tombstoned key', async () => {
    const { id } = (await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    })) as { id: string };
    await db.update('exchange_rates', { id, tombstone: 1 });
    expect(
      await save({
        quoteCurrency: 'JPY',
        rate: '152',
        kind: 'dated',
        date: '2026-03-10',
      }),
    ).toEqual({ status: 'saved', id });
    expect(liveRows()).toEqual([expect.objectContaining({ id, rate: '152' })]);
  });

  it('tombstones a manual rate', async () => {
    const saved = await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    });
    expect(saved).toMatchObject({ status: 'saved' });
    if (saved.status !== 'saved') {
      throw new Error('expected the rate to be saved');
    }
    expect(
      await remove({
        quoteCurrency: 'JPY',
        kind: 'dated',
        date: '2026-03-10',
      }),
    ).toEqual({ status: 'removed', id: saved.id });
    expect(liveRows()).toEqual([]);
    expect(
      await remove({
        quoteCurrency: 'JPY',
        kind: 'dated',
        date: '2026-03-10',
      }),
    ).toEqual({ status: 'missing' });
    await undo();
    expect(liveRows()).toEqual([
      expect.objectContaining({ id: saved.id, rate: '150' }),
    ]);
  });

  it('validates input', async () => {
    const base = {
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    } as const;
    await expect(save({ ...base, quoteCurrency: 'USD' })).rejects.toThrow(
      'rate-currency-invalid',
    );
    await expect(save({ ...base, quoteCurrency: 'CLF' })).rejects.toThrow(
      'rate-currency-invalid',
    );
    await expect(save({ ...base, rate: '-1' })).rejects.toThrow('rate-invalid');
    await expect(save({ ...base, date: '2026-02-30' })).rejects.toThrow(
      'date-invalid',
    );
    await expect(save({ ...base, kind: 'fetched' as never })).rejects.toThrow(
      'rate-kind-invalid',
    );
    expect(liveRows()).toEqual([]);
  });

  it('is unavailable without multicurrency', async () => {
    await setBudget('USD', 2, { flags: false });
    await expect(
      save({
        quoteCurrency: 'JPY',
        rate: '150',
        kind: 'dated',
        date: '2026-03-10',
      }),
    ).rejects.toThrow('multicurrency-unavailable');
    await db.update('preferences', { id: 'defaultCurrencyCode', value: '' });
    await prefs.savePrefs({ amountEncoding: undefined });
    await db.update('preferences', { id: 'flags.currency', value: 'true' });
    await db.update('preferences', {
      id: 'flags.multicurrency',
      value: 'true',
    });
    await expect(
      save({
        quoteCurrency: 'JPY',
        rate: '150',
        kind: 'dated',
        date: '2026-03-10',
      }),
    ).rejects.toThrow('multicurrency-unavailable');
  });

  it('converges offline saves of the same key to one row', async () => {
    const { id } = (await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    })) as { id: string };
    // Another device saved the same key offline; its messages arrive later.
    const remote = (offset: number) => {
      const timestamp = Timestamp.parse(
        `${new Date(Date.now() + 60_000 + offset).toISOString()}-0000-abcdef0123456789`,
      );
      assert(timestamp, 'Expected a valid remote timestamp');
      return timestamp;
    };
    await applyMessages(
      (
        [
          ['base_currency', 'USD'],
          ['quote_currency', 'JPY'],
          ['rate', '153'],
          ['kind', 'dated'],
          ['source', 'manual'],
          ['timestamp', '2026-03-10T00:00:00.000Z'],
          ['spec', JSON.stringify({ rate: '153', kind: 'dated' })],
          ['tombstone', 0],
        ] as const
      ).map(([column, value], i) => ({
        dataset: 'exchange_rates',
        row: exchangeRateId(
          'USD',
          'JPY',
          'manual',
          'dated',
          '2026-03-10T00:00:00.000Z',
        ),
        column,
        value,
        timestamp: remote(i),
      })),
    );
    expect(liveRows()).toEqual([expect.objectContaining({ id, rate: '153' })]);

    await save({
      quoteCurrency: 'JPY',
      rate: '154',
      kind: 'dated',
      date: '2026-03-10',
      replace: true,
    });
    expect(liveRows()).toEqual([expect.objectContaining({ id, rate: '154' })]);
  });

  describe('with sync comparison enabled', () => {
    beforeEach(() => setSyncingMode('enabled'));
    afterEach(() => setSyncingMode('disabled'));

    const key = '2026-03-10T00:00:00.000Z';
    const remoteAt = (offsetMs: number) => {
      const timestamp = Timestamp.parse(
        `${new Date(Date.now() + offsetMs).toISOString()}-0000-abcdef0123456789`,
      );
      assert(timestamp, 'Expected a valid remote timestamp');
      return timestamp;
    };
    const remoteMessage = (
      column: string,
      value: string | null,
      offsetMs: number,
    ) => ({
      dataset: 'exchange_rates',
      row: exchangeRateId('USD', 'JPY', 'manual', 'dated', key),
      column,
      value,
      timestamp: remoteAt(offsetMs),
    });
    const standingSpec = JSON.stringify({
      rate: '151',
      kind: 'standing',
    });

    it.each([
      ['remote spec newer', 60_000, { rate: '151', kind: 'standing' }],
      ['remote spec older', -60_000, { rate: '150', kind: 'dated' }],
    ])(
      'keeps rate and kind coherent when cells interleave (%s)',
      async (_, specOffset, expected) => {
        await save({
          quoteCurrency: 'JPY',
          rate: '150',
          kind: 'dated',
          date: '2026-03-10',
        });
        // Remote kind wins its cell and remote rate loses its cell. The spec
        // cell decides the coherent result either way.
        await applyMessages([
          remoteMessage('kind', 'standing', 60_000),
          remoteMessage('rate', '151', -60_001),
          remoteMessage('spec', standingSpec, specOffset + 3),
        ]);
        expect(db.firstSync('SELECT rate, kind FROM exchange_rates')).toEqual(
          expected,
        );
        if (expected.kind === 'standing') {
          expect(await resolveOn('2026-03-11')).toMatchObject(expected);
        } else {
          expect(await resolveOn('2026-03-11')).toEqual({
            status: 'unavailable',
          });
          expect(
            await resolveOn('2026-03-10', { forEntry: true }),
          ).toMatchObject(expected);
        }
      },
    );
  });

  it('keeps redo history when a request writes nothing', async () => {
    await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    });
    await undo();
    expect(liveRows()).toEqual([]);

    expect(
      await capture({
        quoteCurrency: 'EUR',
        nativePrecision: 2,
        date: '2026-03-10',
        nativeAmount: 100,
      }),
    ).toEqual({ status: 'rate-unavailable' });
    expect(
      await capture({
        quoteCurrency: 'EUR',
        nativePrecision: 2,
        date: '2026-03-10',
        nativeAmount: 100,
        baseAmount: 90,
      }),
    ).toMatchObject({ status: 'ok' });
    await expect(
      capture({
        quoteCurrency: 'EUR',
        nativePrecision: 2,
        date: '2026-03-10',
        nativeAmount: 10,
        rate: '0.000000000000001',
      }),
    ).rejects.toThrow('amount-out-of-range');
    await expect(
      save({
        quoteCurrency: 'JPY',
        rate: '0',
        kind: 'dated',
        date: '2026-03-10',
      }),
    ).rejects.toThrow('rate-invalid');

    await redo();
    expect(liveRows()).toEqual([expect.objectContaining({ rate: '150' })]);
  });

  it('restores the full row through undo and redo', async () => {
    const result = (await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    })) as { id: string };
    await undo();
    expect(liveRows()).toEqual([]);
    await redo();
    expect(liveRows()).toEqual([{ id: result.id, rate: '150', kind: 'dated' }]);
    expect(
      db.runQuery('SELECT COUNT(*) AS count FROM exchange_rates', [], true),
    ).toEqual([{ count: 1 }]);
  });
});

describe('entry capture', () => {
  const entry = {
    quoteCurrency: 'JPY',
    nativePrecision: 0,
    date: '2026-03-10',
    nativeAmount: -1500,
  };

  it('uses a supplied base amount and still saves a supplied rate', async () => {
    expect(
      await capture({ ...entry, baseAmount: -999, rate: '150' }),
    ).toMatchObject({
      status: 'ok',
      baseAmount: -999,
      nativeAmount: -1500,
      rate: { rate: '150', kind: 'explicit' },
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
    ]);
  });

  it('posts base 0 for a zero native amount and still saves a supplied rate', async () => {
    expect(await capture({ ...entry, nativeAmount: 0 })).toEqual({
      status: 'ok',
      baseAmount: 0,
      nativeAmount: 0,
    });
    expect(liveRows()).toEqual([]);
    expect(
      await capture({ ...entry, nativeAmount: 0, rate: '150' }),
    ).toMatchObject({ status: 'ok', baseAmount: 0 });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
    ]);
    expect(
      await capture({ ...entry, nativeAmount: 0, rate: '151' }),
    ).toMatchObject({
      status: 'ok',
      baseAmount: 0,
      rate: { rate: '151', kind: 'explicit' },
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
    ]);
  });

  it('saves the first typed rate for that UTC day only', async () => {
    expect(await capture({ ...entry, rate: '150' })).toMatchObject({
      status: 'ok',
      baseAmount: -1000,
      rate: { rate: '150', kind: 'explicit' },
    });
    expect(await resolveOn('2026-03-10', { forEntry: true })).toMatchObject({
      rate: '150',
      kind: 'dated',
    });
    expect(await resolveOn('2026-03-10')).toEqual({ status: 'unavailable' });
    expect(await resolveOn('2026-04-01', { forEntry: true })).toEqual({
      status: 'unavailable',
    });
    // An identical rate is reused without another write.
    expect(await capture({ ...entry, rate: '150.0' })).toMatchObject({
      status: 'ok',
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
    ]);
  });

  it('leaves the day rate in place when a later entry uses another rate', async () => {
    await capture({ ...entry, rate: '150' });
    expect(await capture({ ...entry, rate: '125' })).toMatchObject({
      status: 'ok',
      baseAmount: -1200,
      rate: { rate: '125', kind: 'explicit' },
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
    ]);
    expect(
      await capture({ ...entry, rate: '125', replaceRate: true }),
    ).toMatchObject({ status: 'ok', baseAmount: -1200 });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '125', kind: 'dated' }),
    ]);
  });

  it('saves a standing rate only when asked, and confirms a conflict', async () => {
    expect(
      await capture({ ...entry, rate: '150', saveStanding: true }),
    ).toMatchObject({ status: 'ok', baseAmount: -1000 });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
      expect.objectContaining({ rate: '150', kind: 'standing' }),
    ]);
    expect(await resolveOn('2026-04-01')).toMatchObject({
      rate: '150',
      kind: 'standing',
    });
    expect(await resolveOn('2026-03-10', { forEntry: true })).toMatchObject({
      rate: '150',
      kind: 'dated',
    });

    expect(
      await capture({ ...entry, rate: '125', saveStanding: true }),
    ).toMatchObject({
      status: 'rate-confirmation-required',
      existing: { rate: '150', kind: 'standing' },
    });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '150', kind: 'dated' }),
      expect.objectContaining({ rate: '150', kind: 'standing' }),
    ]);
    expect(
      await capture({
        ...entry,
        rate: '125',
        saveStanding: true,
        replaceRate: true,
      }),
    ).toMatchObject({ status: 'ok', baseAmount: -1200 });
    expect(liveRows()).toEqual([
      expect.objectContaining({ rate: '125', kind: 'dated' }),
      expect.objectContaining({ rate: '125', kind: 'standing' }),
    ]);
  });

  it('resolves through the hierarchy or reports the rate unavailable', async () => {
    expect(await capture(entry)).toEqual({ status: 'rate-unavailable' });
    await insertRate({
      rate: '150',
      kind: 'standing',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(await capture(entry)).toMatchObject({
      status: 'ok',
      baseAmount: -1000,
      rate: { rate: '150', kind: 'standing' },
    });
  });

  it('converts at 3dp base precision', async () => {
    await setBudget('KWD', 3);
    expect(
      await capture({ ...entry, nativeAmount: 1000, rate: '500' }),
    ).toMatchObject({ status: 'ok', baseAmount: 2000 });
  });

  it('writes nothing when conversion fails', async () => {
    const failing = {
      ...entry,
      quoteCurrency: 'EUR',
      nativePrecision: 2,
      nativeAmount: 10,
      rate: '0.000000000000001',
    };
    await expect(capture(failing)).rejects.toThrow('amount-out-of-range');
    expect(liveRows()).toEqual([]);

    await save({
      quoteCurrency: 'EUR',
      rate: '0.9',
      kind: 'dated',
      date: '2026-03-10',
    });
    await expect(capture({ ...failing, replaceRate: true })).rejects.toThrow(
      'amount-out-of-range',
    );
    expect(liveRows()).toEqual([expect.objectContaining({ rate: '0.9' })]);
  });

  it('validates every input before writing', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ nativeAmount: 1.5 }, 'amount-invalid'],
      [{ baseAmount: 1.5 }, 'amount-invalid'],
      [{ nativePrecision: 16 }, 'precision-invalid'],
      [{ nativePrecision: 1.5 }, 'precision-invalid'],
      [{ date: '2026-02-30' }, 'date-invalid'],
      [{ quoteCurrency: 'USD' }, 'rate-currency-invalid'],
      [{ rate: '0' }, 'rate-invalid'],
    ];
    for (const [override, error] of cases) {
      await expect(
        capture({ ...entry, rate: '150', ...override } as never),
      ).rejects.toThrow(error);
    }
    expect(liveRows()).toEqual([]);
  });

  it('never rewrites existing transactions', async () => {
    await db.insertAccount({ id: 'acct1', name: 'Checking' });
    await db.insertTransaction({
      id: 'tx1',
      account: 'acct1',
      date: '2026-03-10',
      amount: -1000,
    });
    const before = db.firstSync('SELECT * FROM transactions WHERE id = ?', [
      'tx1',
    ]);
    await save({
      quoteCurrency: 'JPY',
      rate: '150',
      kind: 'dated',
      date: '2026-03-10',
    });
    await save({
      quoteCurrency: 'JPY',
      rate: '200',
      kind: 'dated',
      date: '2026-03-10',
      replace: true,
    });
    expect(
      db.firstSync('SELECT * FROM transactions WHERE id = ?', ['tx1']),
    ).toEqual(before);
  });
});

describe('exchangeRateModel', () => {
  const valid = {
    id: 'rate1',
    base_currency: 'USD',
    quote_currency: 'JPY',
    rate: '150.5',
    kind: 'dated',
    source: 'manual',
    timestamp: '2026-03-01T00:00:00.000Z',
    tombstone: 0,
  } as const;

  it('accepts canonical rows', () => {
    expect(exchangeRateModel.validate(valid)).toBe(valid);
    expect(
      exchangeRateModel.validate({ ...valid, kind: 'standing' }),
    ).toBeTruthy();
    expect(
      exchangeRateModel.validate({
        ...valid,
        kind: 'fetched',
        source: 'provider',
        timestamp: '2026-03-01T06:30:00.250Z',
      }),
    ).toBeTruthy();
  });

  it.each([
    { rate: '150.50' },
    { rate: '0' },
    { timestamp: '2026-03-01T00:00:00Z' },
    { kind: 'other' },
    { source: '' },
    { kind: 'fetched', source: 'manual' },
    { quote_currency: 'USD' },
    { base_currency: 'usd' },
  ] as const)('rejects %o', change => {
    expect(() =>
      exchangeRateModel.validate({ ...valid, ...change } as never),
    ).toThrow();
  });
});
