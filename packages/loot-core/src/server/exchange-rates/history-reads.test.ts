import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { undo } from '#server/undo';
import { addUtcDays } from '#shared/exchange-rate';

import { captureFxContext, startFxContext } from './context';
import { decodeHistoryCursor } from './history-codec';
import { historyExport, historyPage, removeFetched } from './history-reads';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  onTestFinished(startFxContext());
});
function insert({
  id = 'row',
  timestamp = '2026-02-28T00:00:00.000Z',
  rate = '0.92',
  source = 'manual',
  kind = 'standing',
  quote = 'EUR',
  tombstone = 0,
}: {
  id?: string | Uint8Array;
  timestamp?: string | Uint8Array;
  rate?: string;
  source?: string;
  kind?: string;
  quote?: string;
  tombstone?: number;
} = {}) {
  db.runQuery(
    'INSERT INTO exchange_rates (id, base_currency, quote_currency, rate, kind, source, timestamp, tombstone) VALUES (CAST(? AS TEXT), ?, ?, ?, ?, ?, CAST(? AS TEXT), ?)',
    [id, 'USD', quote, rate, kind, source, timestamp, tombstone],
  );
}
async function page(cursor?: string, limit = 100) {
  const result = await historyPage({ cursor, limit });
  if (
    !('rows' in result) ||
    !Array.isArray(result.rows) ||
    !('nextCursor' in result) ||
    (typeof result.nextCursor !== 'string' && result.nextCursor !== null)
  ) {
    throw new Error(`page unavailable: ${JSON.stringify(result)}`);
  }
  return result;
}

it('pages 250 rows without duplicates using descending day order', async () => {
  for (let n = 0; n < 250; n++) {
    insert({
      id: `row-${n}`,
      timestamp: `${addUtcDays('2025-01-01', n)}T00:00:00.000Z`,
    });
  }
  const first = await page();
  expect(first.rows).toHaveLength(100);
  const second = await page(first.nextCursor ?? undefined);
  expect(second.rows).toHaveLength(100);
  const third = await page(second.nextCursor ?? undefined);
  expect(third.rows).toHaveLength(50);
  expect(third.nextCursor).toBeNull();
  expect(
    new Set([...first.rows, ...second.rows, ...third.rows].map(row => row.id))
      .size,
  ).toBe(250);
});
it('keeps an invalid row as a cursor boundary without returning it', async () => {
  insert({ id: 'bad', timestamp: 'x' });
  insert({ id: 'good' });
  const first = await page(undefined, 1);
  expect(first).toMatchObject({ rows: [], invalidCount: 1 });
  expect(first.nextCursor).not.toBeNull();
  expect((await page(first.nextCursor ?? undefined, 1)).rows).toMatchObject([
    { id: 'good' },
  ]);
});
it('measures unpageable fields in bytes and excludes embedded NULs', async () => {
  insert({ id: '😀'.repeat(65) });
  insert({ id: 'a\0' + 'b'.repeat(256) });
  insert({ id: 'bad-time', timestamp: '2026-02-28T00:00:00.000Z\0' });
  insert({ id: '' });
  insert({ id: '😀'.repeat(64), timestamp: '2026-03-02T00:00:00.000Z' });
  insert({ id: 'ordinary' });
  const first = await page(undefined, 1);
  expect(first).toMatchObject({
    unpageableCount: 4,
    rows: [{ id: '😀'.repeat(64) }],
  });
  expect(decodeHistoryCursor(first.nextCursor ?? '')?.[2].byteLength).toBe(256);
  const second = await page(first.nextCursor ?? undefined, 1);
  expect(second.rows).toMatchObject([{ id: 'ordinary' }]);
  expect(second).not.toHaveProperty('unpageableCount');
});
it('pages exact malformed and replacement-character id bytes without lossy cursor reuse', async () => {
  insert({ id: new TextEncoder().encode('\uFFFD') });
  insert({ id: Uint8Array.of(255) });
  insert({ id: 'ordinary', timestamp: '2026-02-27T00:00:00.000Z' });
  const first = await page(undefined, 1);
  expect(first.rows).toMatchObject([{ id: '\uFFFD' }]);
  const second = await page(first.nextCursor ?? undefined, 1);
  expect(second).toMatchObject({ rows: [], invalidCount: 1 });
  expect(decodeHistoryCursor(second.nextCursor ?? '')?.[2]).toEqual(
    Uint8Array.of(255),
  );
  const third = await page(second.nextCursor ?? undefined, 1);
  expect(third.rows).toMatchObject([{ id: 'ordinary' }]);
});
it('accepts a boundary containing 256 invalid bytes and returns the next stored row', async () => {
  insert({ id: new Uint8Array(256).fill(255) });
  insert({ id: 'ordinary', timestamp: '2026-02-27T00:00:00.000Z' });
  const first = await page(undefined, 1);
  expect(first).toMatchObject({ rows: [], invalidCount: 1 });
  expect(decodeHistoryCursor(first.nextCursor ?? '')?.[2]).toEqual(
    new Uint8Array(256).fill(255),
  );
  expect((await page(first.nextCursor ?? undefined, 1)).rows).toMatchObject([
    { id: 'ordinary' },
  ]);
});
it('keeps a malformed timestamp boundary in its original byte order', async () => {
  const timestamp = Uint8Array.of(0x32, 0x30, 0x32, 0x36, 0xc3, 0x28);
  insert({ id: 'bad', timestamp });
  insert({ id: 'ordinary', timestamp: '2025-02-27T00:00:00.000Z' });
  const first = await page(undefined, 1);
  expect(first).toMatchObject({ rows: [], invalidCount: 1 });
  expect(decodeHistoryCursor(first.nextCursor ?? '')?.[1]).toEqual(timestamp);
  expect((await page(first.nextCursor ?? undefined, 1)).rows).toMatchObject([
    { id: 'ordinary' },
  ]);
});
it('preserves BOM-prefixed displayed ids and removes only the reviewed one', async () => {
  insert({ id: 'a', kind: 'fetched', source: 'plugin:fxtest' });
  insert({ id: '\uFEFFa', kind: 'fetched', source: 'plugin:fxtest' });
  const result = await page();
  expect(result.rows.map(row => row.id)).toEqual(['a', '\uFEFFa']);
  const captured = await captureFxContext();
  if (!captured) throw new Error('context unavailable');
  expect(
    await removeFetched({
      id: '\uFEFFa',
      context: captured.context,
      reviewed: {
        rate: '0.92',
        source: 'plugin:fxtest',
        timestamp: '2026-02-28T00:00:00.000Z',
      },
    }),
  ).toEqual({ status: 'removed' });
  expect((await page()).rows.map(row => row.id)).toEqual(['a']);
  await undo();
  expect((await page()).rows.map(row => row.id)).toEqual(['a', '\uFEFFa']);
});
it('exports only validated midnight rows with allowlisted provenance', async () => {
  insert({ id: 'manual' });
  insert({
    id: 'fetched',
    timestamp: '2026-02-25T00:00:00.000Z',
    rate: '0.91',
    kind: 'fetched',
    source: 'plugin:fxtest',
  });
  insert({ id: 'bad-rate', rate: 'abc' });
  insert({ id: 'bad-source', kind: 'fetched', source: '=HYPERLINK("x")' });
  insert({ id: 'bad-plugin', kind: 'fetched', source: 'plugin:Bad_ID' });
  insert({ id: 'expanded', timestamp: '+010000-01-01T00:00:00.000Z' });
  insert({ id: 'midday', timestamp: '2026-02-28T12:00:00.000Z' });
  insert({ id: 'deleted', tombstone: 1 });
  const result = await historyExport({});
  expect(result).toMatchObject({
    status: 'ok',
    rowCount: 2,
    omittedCount: 5,
    csv: 'base_currency,quote_currency,rate,kind,date,source,timestamp\nUSD,EUR,0.91,fetched,2026-02-25,plugin:fxtest,2026-02-25T00:00:00.000Z\nUSD,EUR,0.92,standing,2026-02-28,manual,2026-02-28T00:00:00.000Z\n',
  });
});
it('rejects bad filters and cursors, clamps a positive page limit, and filters days', async () => {
  insert();
  expect(await historyPage({ cursor: 'abc' })).toEqual({
    status: 'error',
    code: 'cursor-invalid',
  });
  expect(await historyPage({ from: '2026-02-30' })).toEqual({
    status: 'error',
    code: 'filter-invalid',
  });
  expect(await historyExport({ from: '2026-03-01', to: '2026-02-28' })).toEqual(
    { status: 'error', code: 'filter-invalid' },
  );
  expect(await historyPage({ limit: 501 })).toMatchObject({
    status: 'ok',
    rows: [{ id: 'row' }],
  });
  expect(await historyPage({ kind: 'fetched' })).toMatchObject({
    status: 'ok',
    rows: [],
  });
  expect(await historyExport({ from: '2026-03-01' })).toMatchObject({
    status: 'ok',
    rowCount: 0,
  });
});
it('requires the current context and matching reviewed fields for fetched removal', async () => {
  insert({ kind: 'fetched', source: 'plugin:fxtest' });
  const captured = await captureFxContext();
  if (!captured) throw new Error('context unavailable');
  const reviewed = {
    rate: '0.92',
    source: 'plugin:fxtest',
    timestamp: '2026-02-28T00:00:00.000Z',
  };
  expect(await removeFetched({ id: 'row', context: 'old', reviewed })).toEqual({
    status: 'superseded',
  });
  expect(
    await removeFetched({
      id: 'row',
      context: captured.context,
      reviewed: { ...reviewed, rate: '0.91' },
    }),
  ).toEqual({ status: 'stale' });
  expect((await page()).rows).toHaveLength(1);
});

it('excludes a newer insertion after the boundary and includes an older insertion', async () => {
  insert({ id: 'initial-new', timestamp: '2026-03-03T00:00:00.000Z' });
  insert({ id: 'initial-old', timestamp: '2026-03-02T00:00:00.000Z' });
  const first = await page(undefined, 1);
  insert({ id: 'late-new', timestamp: '2026-03-04T00:00:00.000Z' });
  insert({ id: 'late-old', timestamp: '2026-03-01T00:00:00.000Z' });
  const second = await page(first.nextCursor ?? undefined, 1);
  const third = await page(second.nextCursor ?? undefined, 1);
  expect(
    [...first.rows, ...second.rows, ...third.rows].map(row => row.id),
  ).toEqual(['initial-new', 'initial-old', 'late-old']);
  expect((await page(third.nextCursor ?? undefined, 1)).nextCursor).toBeNull();
});

it('uses the hundredth raw row as the boundary even when it is invalid', async () => {
  for (let n = 0; n < 120; n++) {
    insert({
      id: `row${String(n).padStart(3, '0')}`,
      rate: n === 99 ? 'abc' : '0.92',
    });
  }
  const first = await page();
  expect(first.rows).toHaveLength(99);
  expect(first).toMatchObject({ invalidCount: 1 });
  const second = await page(first.nextCursor ?? undefined);
  expect(second.rows).toHaveLength(20);
  expect(second.nextCursor).toBeNull();
});

it('clamps an oversized requested page to 500 and applies quote and date filters', async () => {
  for (let n = 0; n < 502; n++) {
    insert({ id: `row${String(n).padStart(3, '0')}` });
  }
  const first = await historyPage({ limit: 501 });
  if (first.status !== 'ok') throw new Error('page unavailable');
  expect(first.rows).toHaveLength(500);
  expect((await page(first.nextCursor ?? undefined)).rows).toHaveLength(2);
  insert({ id: 'jpy-in', quote: 'JPY', timestamp: '2026-02-15T00:00:00.000Z' });
  insert({
    id: 'jpy-out',
    quote: 'JPY',
    timestamp: '2026-03-01T00:00:00.000Z',
  });
  const filter = { quoteCurrency: 'JPY', from: '2026-02-01', to: '2026-02-28' };
  expect(await historyPage(filter)).toMatchObject({ rows: [{ id: 'jpy-in' }] });
  expect(await historyExport(filter)).toMatchObject({ rowCount: 1 });
});

it('leaves manual rows to the existing manual-remove handler', async () => {
  insert();
  const captured = await captureFxContext();
  if (!captured) throw new Error('context unavailable');
  expect(
    await removeFetched({
      id: 'row',
      context: captured.context,
      reviewed: {
        rate: '0.92',
        source: 'manual',
        timestamp: '2026-02-28T00:00:00.000Z',
      },
    }),
  ).toEqual({ status: 'missing' });
  expect((await page()).rows).toHaveLength(1);
});
