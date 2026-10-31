import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import type { ExchangeRateEntity } from '#types/models';

import { resolveRate, selectRate } from './app';

function rate(
  id: string,
  kind: ExchangeRateEntity['kind'],
  value: string,
  timestamp: string,
  { source = kind === 'fetched' ? 'provider' : 'manual', quote = 'JPY' } = {},
  tombstone: 0 | 1 = 0,
): ExchangeRateEntity {
  return {
    id,
    base_currency: 'USD',
    quote_currency: quote,
    rate: value,
    kind,
    source,
    timestamp,
    tombstone,
  };
}

// Deliberately unsorted. Two fetched rows share a timestamp and differ by
// source; two more share timestamp and source and differ by id.
const ROWS = [
  rate('s2', 'standing', '110', '2026-01-20T00:00:00.000Z'),
  rate('f3', 'fetched', '120', '2026-01-10T00:00:00.000Z', { source: 'b' }),
  rate('s1', 'standing', '100', '2026-01-01T00:00:00.000Z'),
  rate('f2', 'fetched', '121', '2026-01-10T00:00:00.000Z', { source: 'a' }),
  rate('f1', 'fetched', '130', '2026-01-03T00:00:00.000Z'),
  rate('d1', 'dated', '140', '2026-01-15T00:00:00.000Z'),
  rate('f5', 'fetched', '151', '2026-01-23T00:00:00.000Z', { source: 'c' }),
  rate('f4', 'fetched', '150', '2026-01-23T00:00:00.000Z', { source: 'c' }),
  // Malformed synced rows: a noncanonical timestamp and an invalid rate.
  rate('m1', 'fetched', '999', '2026-01-19T00:00:00Z'),
  rate('m2', 'fetched', '-1', '2026-01-19T00:00:00.000Z', { source: 'm' }),
  rate('t1', 'fetched', '777', '2026-01-19T00:00:00.000Z', { source: 't' }, 1),
  rate('k1', 'fetched', '0.3', '2026-01-19T00:00:00.000Z', { quote: 'KWD' }),
];

const select = (date: string, forEntry = false) =>
  selectRate(ROWS, {
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    date,
    forEntry,
  });

describe('selectRate', () => {
  it.each([
    ['2026-01-02', false, '100', 'standing', false],
    ['2026-01-05', false, '130', 'fetched', true],
    ['2026-01-10', false, '121', 'fetched', false],
    // Exactly seven days old still falls back; eight days does not.
    ['2026-01-17', false, '121', 'fetched', true],
    ['2026-01-18', false, '100', 'standing', false],
    ['2026-01-15', false, '121', 'fetched', true],
    ['2026-01-15', true, '140', 'dated', false],
    ['2026-01-16', true, '121', 'fetched', true],
    ['2026-01-19', false, '100', 'standing', false],
    ['2026-01-20', false, '110', 'standing', false],
    ['2026-01-23', false, '150', 'fetched', false],
  ])('on %s with forEntry %s', (date, forEntry, value, kind, fallback) => {
    expect(select(date, forEntry)).toMatchObject({
      status: 'resolved',
      rate: value,
      kind,
      fallback,
    });
  });

  it('is unavailable before any rate applies', () => {
    expect(select('2025-12-31')).toEqual({ status: 'unavailable' });
  });
});

describe('selectRate and resolveRate on one database', () => {
  beforeEach(async () => {
    await global.emptyDatabase()();
    await loadMappings();
    await prefs.loadPrefs();
    for (const row of ROWS) {
      db.runQuery(
        `INSERT INTO exchange_rates (id, base_currency, quote_currency, rate,
           kind, source, timestamp, tombstone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.base_currency,
          row.quote_currency,
          row.rate,
          row.kind,
          row.source,
          row.timestamp,
          row.tombstone,
        ],
      );
    }
  });

  it('agrees on every date and entry mode', async () => {
    const stored = db.runQuery<ExchangeRateEntity>(
      'SELECT * FROM exchange_rates ORDER BY rate DESC',
      [],
      true,
    );
    for (let day = 1; day <= 31; day++) {
      for (const date of [
        `2025-12-${String(day).padStart(2, '0')}`,
        `2026-01-${String(day).padStart(2, '0')}`,
      ]) {
        for (const forEntry of [false, true]) {
          const request = {
            baseCurrency: 'USD',
            quoteCurrency: 'JPY',
            date,
            forEntry,
          };
          expect(selectRate(stored, request)).toEqual(
            await resolveRate(request),
          );
        }
      }
    }
  });
});
