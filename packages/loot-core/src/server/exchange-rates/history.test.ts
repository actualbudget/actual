import type { MockInstance } from 'vitest';

import * as fs from '#platform/server/fs';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import * as mutators from '#server/mutators';
import * as prefs from '#server/prefs';
import { getServer, setServer } from '#server/server-config';
import { undo } from '#server/undo';
import { addUtcDays } from '#shared/exchange-rate';

import { exchangeRateId, writeManualRate } from './app';
import {
  captureFxContext,
  notifyFxContextChanged,
  startFxContext,
} from './context';
import {
  importCancel,
  importCommit,
  importPreview,
  importPreviewBegin,
} from './history';
import { historyExport, historyPage } from './history-reads';

const header = 'quote_currency,rate,kind,date\n';
const csv =
  header +
  'EUR,0.92,standing,2026-02-28\nEUR,0.88,standing,2026-02-27\nEUR,0.85,standing,2026-02-26\nEUR,0.84,standing,2026-02-25';
const key = (date: string) =>
  exchangeRateId('USD', 'EUR', 'manual', 'standing', `${date}T00:00:00.000Z`);
let read: MockInstance<typeof fs.readFile>;
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
  read = vi.spyOn(fs, 'readFile');
  onTestFinished(() => {
    read.mockRestore();
  });
  read.mockResolvedValue(new TextEncoder().encode(csv));
});
async function preview() {
  const begin = await importPreviewBegin();
  if (
    !('operation' in begin) ||
    typeof begin.operation !== 'number' ||
    !('context' in begin) ||
    typeof begin.context !== 'string'
  ) {
    throw new Error('preview begin failed');
  }
  const result = await importPreview({
    operation: begin.operation,
    filepath: '/chosen.csv',
  });
  return { ...begin, result };
}
async function seed() {
  for (const [date, rate] of [
    ['2026-02-28', '0.9'],
    ['2026-02-27', '0.88'],
    ['2026-02-26', '0.85'],
  ]) {
    await runMutator(() =>
      writeManualRate({
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        kind: 'standing',
        rate,
        timestamp: `${date}T00:00:00.000Z`,
      }),
    );
  }
  await db.update('exchange_rates', { id: key('2026-02-27'), tombstone: 1 });
}
function live() {
  return db.runQuery<{ rate: string; timestamp: string }>(
    'SELECT rate, timestamp FROM exchange_rates WHERE tombstone = 0 ORDER BY timestamp',
    [],
    true,
  );
}

it('classifies every reviewed database row and writes keep as one undo step', async () => {
  await seed();
  const before = live();
  const plan = await preview();
  expect(plan.result).toMatchObject({
    status: 'ok',
    counts: { new: 2, unchanged: 1, conflict: 1 },
    rows: [{ class: 'conflict', existingRate: '0.9' }, { class: 'unchanged' }],
  });
  expect(live()).toEqual(before);
  expect(await importCommit({ ...plan, policy: 'keep' })).toEqual({
    status: 'ok',
    written: 2,
    replaced: 0,
    kept: 1,
  });
  expect(live()).toHaveLength(4);
  await undo();
  expect(live()).toEqual(before);
});
it('replaces only reviewed conflicts when explicitly requested', async () => {
  await seed();
  const plan = await preview();
  expect(await importCommit({ ...plan, policy: 'replace' })).toEqual({
    status: 'ok',
    written: 3,
    replaced: 1,
    kept: 0,
  });
  expect(
    db.firstSync<{ rate: string; spec: string }>(
      'SELECT rate, spec FROM exchange_rates WHERE id = ?',
      [key('2026-02-28')],
    ),
  ).toEqual({ rate: '0.92', spec: '{"rate":"0.92","kind":"standing"}' });
});
it.each([
  { date: '2026-02-28', change: { rate: '0.95' } },
  { date: '2026-02-27', change: { rate: '0.87' } },
  { date: '2026-02-28', change: { quote_currency: 'JPY' } },
])(
  'rejects a changed fingerprint even when its class is unchanged: %j',
  async ({ date, change }) => {
    await seed();
    const plan = await preview();
    await db.update('exchange_rates', {
      id: key(date),
      ...change,
      ...('rate' in change
        ? { spec: JSON.stringify({ rate: change.rate, kind: 'standing' }) }
        : {}),
    });
    if ('rate' in change) {
      expect(
        db.firstSync<{ rate: string }>(
          'SELECT rate FROM exchange_rates WHERE id = ?',
          [key(date)],
        )?.rate,
      ).toBe(change.rate);
    }
    const before = live();
    expect(await importCommit({ ...plan, policy: 'replace' })).toEqual({
      status: 'error',
      code: 'stale-preview',
    });
    expect(live()).toEqual(before);
    expect(await importCommit({ ...plan, policy: 'replace' })).toEqual({
      status: 'error',
      code: 'preview-not-found',
    });
  },
);
it('excludes a wrong logical key under the deterministic id', async () => {
  await seed();
  await db.update('exchange_rates', {
    id: key('2026-02-28'),
    quote_currency: 'JPY',
  });
  const plan = await preview();
  expect(plan.result).toMatchObject({
    counts: { invalid: 1 },
    rows: expect.arrayContaining([
      expect.objectContaining({ class: 'invalid', error: 'key-mismatch' }),
    ]),
  });
  expect(await importCommit({ ...plan, policy: 'replace' })).toMatchObject({
    status: 'ok',
    written: 2,
  });
  expect(
    db.firstSync<{ quote_currency: string; rate: string }>(
      'SELECT quote_currency, rate FROM exchange_rates WHERE id = ?',
      [key('2026-02-28')],
    ),
  ).toEqual({ quote_currency: 'JPY', rate: '0.9' });
});
it('allows one read per reservation and exact-number cancellation only', async () => {
  const first = await preview();
  expect(
    await importPreview({ operation: first.operation, filepath: '/again.csv' }),
  ).toEqual({ status: 'superseded' });
  expect(read).toHaveBeenCalledTimes(1);
  const second = await preview();
  expect(second.operation).toBeGreaterThan(first.operation);
  await importCancel({ operation: first.operation });
  expect(await importCommit({ ...first, policy: 'keep' })).toEqual({
    status: 'error',
    code: 'preview-not-found',
  });
  expect(await importCommit({ ...second, policy: 'keep' })).toMatchObject({
    status: 'ok',
    written: 4,
  });
});
it.each(['cancel', 'replace'])(
  'suppresses a revoked read after%s and ignores an old cancellation',
  async revoke => {
    let release: () => void = () => undefined;
    read.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = () => resolve(new TextEncoder().encode(csv));
        }),
    );
    const first = await importPreviewBegin();
    if (!('operation' in first) || typeof first.operation !== 'number') {
      throw new Error('begin failed');
    }
    const old = importPreview({
      operation: first.operation,
      filepath: '/old.csv',
    });
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    if (revoke === 'cancel') await importCancel({ operation: first.operation });
    const second = await preview();
    await importCancel({ operation: first.operation });
    expect(
      await importPreview({
        operation: first.operation,
        filepath: '/replay.csv',
      }),
    ).toEqual({ status: 'superseded' });
    release();
    expect(await old).toEqual({ status: 'superseded' });
    expect(read).toHaveBeenCalledTimes(2);
    expect(await importCommit({ ...second, policy: 'keep' })).toMatchObject({
      status: 'ok',
      written: 4,
    });
  },
);
it('claims authority inside the mutation queue after any cancellation', async () => {
  const plan = await preview();
  let unlock: () => void = () => undefined;
  let locked = false;
  const blocker = runMutator(async () => {
    locked = true;
    await new Promise<void>(resolve => {
      unlock = resolve;
    });
  });
  onTestFinished(async () => {
    unlock();
    await blocker;
  });
  await vi.waitFor(() => expect(locked).toBe(true));
  const queued = vi.spyOn(mutators, 'runMutator');
  onTestFinished(() => {
    queued.mockRestore();
  });
  const pending = importCommit({ ...plan, policy: 'keep' });
  await vi.waitFor(() => expect(queued).toHaveBeenCalledOnce());
  await importCancel({ operation: plan.operation });
  unlock();
  await blocker;
  expect(await pending).toEqual({ status: 'error', code: 'preview-not-found' });
  expect(live()).toEqual([]);
});
it('rejects a stale client context without writing', async () => {
  const plan = await preview();
  await notifyFxContextChanged('budget');
  expect((await captureFxContext())?.context).not.toBe(plan.context);
  expect(await importCommit({ ...plan, policy: 'keep' })).toEqual({
    status: 'superseded',
  });
  expect(live()).toEqual([]);
});

it('consumes a claimed preview even when the commit supplies the wrong context', async () => {
  const plan = await preview();
  expect(
    await importCommit({ ...plan, policy: 'keep', context: 'wrong' }),
  ).toEqual({ status: 'superseded' });
  expect(await importCommit({ ...plan, policy: 'keep' })).toEqual({
    status: 'error',
    code: 'preview-not-found',
  });
  expect(live()).toEqual([]);
});
it('checks the extension before reading and redacts read failures', async () => {
  const begin = await importPreviewBegin();
  if (!('operation' in begin) || typeof begin.operation !== 'number') {
    throw new Error('begin failed');
  }
  expect(
    await importPreview({
      operation: begin.operation,
      filepath: '/private.txt',
    }),
  ).toEqual({ status: 'error', code: 'file-unreadable' });
  expect(read).not.toHaveBeenCalled();
  read.mockRejectedValue(new Error('PRIVATE_PATH_AND_ERROR'));
  expect((await preview()).result).toEqual({
    status: 'error',
    code: 'file-unreadable',
  });
});
it('caps preview details at 200 while retaining all row counts', async () => {
  read.mockResolvedValue(
    new TextEncoder().encode(
      header + 'XXX,1,standing,2026-02-28\n'.repeat(250),
    ),
  );
  const { result } = await preview();
  expect(result).toMatchObject({ status: 'ok', counts: { invalid: 250 } });
  if (!('rows' in result) || !Array.isArray(result.rows)) {
    throw new Error('preview rows missing');
  }
  expect(result.rows).toHaveLength(200);
});

it('commits 20000 distinct manual keys in one undo step and records timing', async () => {
  // The shared test clock is frozen; this workload emits more than 65535 CRDT cells.
  const wallClock = vi
    .spyOn(Date, 'now')
    .mockImplementation(() => new Date().getTime());
  onTestFinished(() => {
    wallClock.mockRestore();
  });
  const count = 20000;
  const data = Array.from(
    { length: count },
    (_, n) => `EUR,1.${n + 1},standing,${addUtcDays('1971-01-01', n)}`,
  ).join('\n');
  expect(addUtcDays('1971-01-01', count - 1)).toBe('2025-10-03');
  read.mockResolvedValue(new TextEncoder().encode(header + data));
  const plan = await preview();
  expect(plan.result).toMatchObject({ status: 'ok', counts: { new: count } });
  const start = performance.now();
  expect(await importCommit({ ...plan, policy: 'keep' })).toEqual({
    status: 'ok',
    written: count,
    replaced: 0,
    kept: 0,
  });
  const committed = performance.now();
  expect(live()).toHaveLength(count);
  await undo();
  const undone = performance.now();
  expect(live()).toEqual([]);
  console.error('P26 benchmark timings', {
    commitMs: Math.round(committed - start),
    undoMs: Math.round(undone - committed),
    rows: count,
  });
}, 120000);

it('keeps a newer ready preview when an older queued commit finally claims', async () => {
  const first = await preview();
  let unlock: () => void = () => undefined;
  let locked = false;
  const blocker = runMutator(async () => {
    locked = true;
    await new Promise<void>(resolve => {
      unlock = resolve;
    });
  });
  onTestFinished(async () => {
    unlock();
    await blocker;
  });
  await vi.waitFor(() => expect(locked).toBe(true));
  const queued = vi.spyOn(mutators, 'runMutator');
  onTestFinished(() => {
    queued.mockRestore();
  });
  const pending = importCommit({ ...first, policy: 'replace' });
  await vi.waitFor(() => expect(queued).toHaveBeenCalledOnce());
  await importCancel({ operation: first.operation });
  const second = await preview();
  unlock();
  await blocker;
  expect(await pending).toEqual({ status: 'error', code: 'preview-not-found' });
  expect(live()).toEqual([]);
  expect(await importCommit({ ...second, policy: 'keep' })).toMatchObject({
    status: 'ok',
    written: 4,
  });
});

it('rechecks a newly filled key after a held mutation completes', async () => {
  await seed();
  const plan = await preview();
  let unlock: () => void = () => undefined;
  let locked = false;
  const blocker = runMutator(async () => {
    locked = true;
    await new Promise<void>(resolve => {
      unlock = resolve;
    });
    await writeManualRate({
      baseCurrency: 'USD',
      quoteCurrency: 'EUR',
      rate: '0.95',
      kind: 'standing',
      timestamp: '2026-02-25T00:00:00.000Z',
    });
  });
  onTestFinished(async () => {
    unlock();
    await blocker;
  });
  await vi.waitFor(() => expect(locked).toBe(true));
  const queued = vi.spyOn(mutators, 'runMutator');
  onTestFinished(() => {
    queued.mockRestore();
  });
  const pending = importCommit({ ...plan, policy: 'keep' });
  await vi.waitFor(() => expect(queued).toHaveBeenCalledOnce());
  unlock();
  await blocker;
  expect(await pending).toEqual({ status: 'error', code: 'stale-preview' });
  expect(live()).toHaveLength(3);
  expect(
    db.firstSync<{ rate: string }>(
      'SELECT rate FROM exchange_rates WHERE id = ?',
      [key('2026-02-25')],
    )?.rate,
  ).toBe('0.95');
});

it('rejects retired and duplicate reads while the newer reservation is still reading', async () => {
  let releaseOld: () => void = () => undefined;
  let releaseNew: () => void = () => undefined;
  read
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          releaseOld = () => resolve(new TextEncoder().encode(csv));
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          releaseNew = () => resolve(new TextEncoder().encode(csv));
        }),
    );
  onTestFinished(() => {
    releaseOld();
    releaseNew();
  });
  const first = await importPreviewBegin();
  if (first.status !== 'ok') throw new Error('begin failed');
  const oldRead = importPreview({
    operation: first.operation,
    filepath: '/old.csv',
  });
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  await importCancel({ operation: first.operation });
  const second = await importPreviewBegin();
  if (second.status !== 'ok') throw new Error('begin failed');
  const newRead = importPreview({
    operation: second.operation,
    filepath: '/new.csv',
  });
  await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  expect(
    await importPreview({
      operation: first.operation,
      filepath: '/replay.csv',
    }),
  ).toEqual({ status: 'superseded' });
  expect(
    await importPreview({
      operation: second.operation,
      filepath: '/duplicate.csv',
    }),
  ).toEqual({ status: 'superseded' });
  await importCancel({ operation: first.operation });
  releaseNew();
  expect(await newRead).toMatchObject({ status: 'ok' });
  releaseOld();
  expect(await oldRead).toEqual({ status: 'superseded' });
  expect(read).toHaveBeenCalledTimes(2);
  expect(await importCommit({ ...second, policy: 'keep' })).toMatchObject({
    status: 'ok',
    written: 4,
  });
});

it('reimports an export as unchanged manual rows and skipped fetched history', async () => {
  await seed();
  db.runQuery(
    "INSERT INTO exchange_rates (id, base_currency, quote_currency, rate, kind, source, timestamp, tombstone) VALUES ('fetched', 'USD', 'EUR', '0.91', 'fetched', 'plugin:fxtest', '2026-02-25T00:00:00.000Z', 0)",
  );
  const exported = await historyExport({});
  if (exported.status !== 'ok') throw new Error('export failed');
  read.mockResolvedValue(new TextEncoder().encode(exported.csv));
  const plan = await preview();
  expect(plan.result).toMatchObject({
    counts: { new: 0, unchanged: 2, 'skipped-fetched': 1 },
    ignoredColumns: ['source', 'timestamp'],
  });
});

it('imports, exports and pages without any configured server', async () => {
  const previousServer = getServer()?.BASE_SERVER ?? null;
  setServer(null);
  onTestFinished(() => setServer(previousServer));
  const plan = await preview();
  expect(await importCommit({ ...plan, policy: 'keep' })).toMatchObject({
    status: 'ok',
    written: 4,
  });
  expect(await historyExport({})).toMatchObject({ status: 'ok', rowCount: 4 });
  const page = await historyPage({});
  if (page.status !== 'ok') throw new Error('offline page failed');
  expect(page.rows).toHaveLength(4);
});
