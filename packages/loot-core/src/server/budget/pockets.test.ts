import { Timestamp } from '@actual-app/crdt';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { amountPair } from '#server/sync/coupled-cells';
import { deserializeValue } from '#server/sync/serialization';
import { batchUpdateTransactions } from '#server/transactions';
import { app as transactionsApp } from '#server/transactions/app';
import { loadRules } from '#server/transactions/transaction-rules';
import { clearUndo, redo, undo, withUndo } from '#server/undo';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';

import { createAllBudgets, setType } from './base';
import { stopFxDayWatch } from './fx-valuation';
import {
  baseSlotShown,
  createBaseLane,
  createPocket,
  rebuildSlotResolution,
  retireLane,
  writePocketBudgetCell,
} from './pockets';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const move = transactionsApp.handlers['transactions/move-foreign-entry'];
const editForeign =
  transactionsApp.handlers['transactions/update-foreign-entry'];

const remote = (
  dataset: string,
  row: string,
  column: string,
  value: string | number | null,
  timestamp: Timestamp = Timestamp.send()!,
): Message => ({ dataset, row, column, value, timestamp });

/** A row another device wrote, cell by cell, without this device's guards. */
function remoteRow(
  id: string,
  fields: Record<string, string | number | null>,
): Message[] {
  return Object.entries(fields).map(([column, value]) =>
    remote('transactions', id, column, value),
  );
}

/** A lane another device created. */
function remoteLane(
  id: string,
  category: string,
  encoding: string,
  kind: 'base' | 'foreign' = 'foreign',
): Message[] {
  return [
    remote('category_pockets', id, 'category', category),
    remote('category_pockets', id, 'kind', kind),
    remote('category_pockets', id, 'encoding', encoding),
    remote('category_pockets', id, 'tombstone', 0),
  ];
}

type Stored = {
  category: string | null;
  pocket: string | null;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  amount_pair: string | null;
  pair_encoding: string | null;
};
const stored = (id: string) =>
  db.firstSync<Stored>(
    `SELECT category, pocket, acct, amount, transaction_amount, amount_pair,
       pair_encoding FROM transactions WHERE id = ?`,
    [id],
  )!;
const laneOf = (id: string) =>
  db.firstSync<{ lane: string | null }>(
    'SELECT lane FROM v_transaction_lanes WHERE id = ?',
    [id],
  )!.lane;
const resolution = (lane: string) =>
  db.firstSync<{
    effective_category: string | null;
    effective_owner: string | null;
    status: string;
    active: number;
  }>(
    `SELECT effective_category, effective_owner, status, active
       FROM slot_resolution WHERE lane = ?`,
    [lane],
  );
const cell = (id: string) =>
  db.firstSync<{
    id: string;
    lane: string;
    month: number;
    budget_pair: string | null;
    amount: number | null;
    amount_encoding: string | null;
    base_amount: number | null;
    capture_date: string | null;
  }>(
    `SELECT id, lane, month, budget_pair, amount, amount_encoding, base_amount,
       capture_date FROM pocket_budgets WHERE id = ?`,
    [id],
  );

/** The category every transaction reader shows, through AQL. */
async function shownCategory(id: string) {
  const { data } = await aqlQuery(
    q('transactions').filter({ id }).select(['id', 'category']),
  );
  return (data as Array<{ category: string | null }>)[0]?.category ?? null;
}

function expectedOf(id: string) {
  const row = db.firstSync<{
    acct: string;
    amount: number;
    transaction_amount: number | null;
    date: number;
  }>(
    'SELECT acct, amount, transaction_amount, date FROM transactions WHERE id = ?',
    [id],
  )!;
  return {
    account: row.acct,
    amount: row.amount,
    transaction_amount: row.transaction_amount,
    date: db.fromDateRepr(row.date),
  };
}

const yen = (
  id: string,
  account: string,
  native: number,
  category: string,
  date = '2017-01-12',
) => ({
  id,
  account,
  date,
  amount: native,
  transaction_amount: native,
  category,
});

const sumAmount = (month: string, category: string) =>
  sheet.getCellValue(
    `budget${month.replace('-', '')}`,
    `sum-amount-${category}`,
  );

/** A category's spending read fresh, by the per-cell sum-amount query. */
const freshSum = (month: string, category: string) => {
  const { start, end } = monthUtils.bounds(month);
  return (
    db.firstSync<{ amount: number | null }>(
      `SELECT SUM(amount) AS amount FROM v_transactions_internal_alive t
         LEFT JOIN accounts a ON a.id = t.account
       WHERE t.date >= ? AND t.date <= ? AND category = ? AND a.offbudget = 0`,
      [start, end, category],
    )?.amount ?? 0
  );
};

/** Warm sheet totals equal fresh reads. */
async function expectWarmSums(categories: string[]) {
  await sheet.waitOnSpreadsheet();
  for (const category of categories) {
    expect(sumAmount('2017-01', category)).toBe(freshSum('2017-01', category));
  }
}

async function setup() {
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
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
}

beforeEach(async () => {
  // Offline sync records every message, so the log can be replayed.
  setSyncingMode('offline');
  await setup();
  await loadRules();
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'jpy2', name: 'Yen 2', currency: 'JPY' },
    { id: 'jpyOff', name: 'Yen savings', currency: 'JPY', offbudget: 1 },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
    { id: 'iqd', name: 'Iraqi dinar', currency: 'IQD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategoryGroup({
    id: 'incomeGroup',
    name: 'Income',
    is_income: 1,
  });
  for (const id of ['travel', 'food', 'shop']) {
    await db.insertCategory({ id, name: id, cat_group: 'group' });
  }
  await db.insertCategory({
    id: 'salary',
    name: 'Salary',
    cat_group: 'incomeGroup',
    is_income: 1,
  });
  clearUndo();
});

afterEach(() => {
  stopFxDayWatch();
  setSyncingMode('disabled');
});

/** The whole message log, applied to a fresh database in either order. */
async function replayLog(order: 'forward' | 'reverse') {
  const log = db
    .runQuery<{
      timestamp: string;
      dataset: string;
      row: string;
      column: string;
      value: string;
    }>('SELECT * FROM messages_crdt ORDER BY timestamp', [], true)
    .map(message => ({
      ...message,
      timestamp: Timestamp.parse(message.timestamp)!,
      value: deserializeValue(message.value),
    }));
  stopFxDayWatch();
  await setup();
  if (order === 'forward') {
    await applyMessages(log);
  } else {
    for (const message of [...log].reverse()) {
      await applyMessages([message]);
    }
  }
}

/** A budget load: the resolution is rebuilt from the synced tables. */
function reload() {
  db.runQuery('DELETE FROM slot_resolution');
  rebuildSlotResolution();
}

describe('lane storage', () => {
  it('stores a finer same-currency cell whole, without changing the lane', async () => {
    const { id: lane } = await createPocket({
      category: 'food',
      currency: 'IQD',
    });
    expect(
      db.firstSync('SELECT encoding FROM category_pockets WHERE id = ?', [
        lane,
      ]),
    ).toEqual({ encoding: 'IQD.0' });
    expect(
      await writePocketBudgetCell({
        lane,
        month: '2017-01',
        pair: {
          native: -500,
          base: -50,
          encoding: 'IQD.3',
          captureDate: '2017-01-31',
        },
      }),
    ).toEqual({ status: 'ok' });
    expect(cell(`201701-${lane}`)).toEqual({
      id: `201701-${lane}`,
      lane,
      month: 201701,
      budget_pair: '-500:-50~IQD.3@2017-01-31',
      amount: -500,
      amount_encoding: 'IQD.3',
      base_amount: -50,
      capture_date: '2017-01-31',
    });
    // The creation encoding, which decides admission, is unchanged.
    expect(
      db.firstSync('SELECT encoding FROM category_pockets WHERE id = ?', [
        lane,
      ]),
    ).toEqual({ encoding: 'IQD.0' });
    expect(
      db.runQuery('SELECT id FROM category_pockets', [], true),
    ).toHaveLength(1);
  });

  it('keeps a pending base absent and rejects another currency', async () => {
    const { id: lane } = await createPocket({
      category: 'food',
      currency: 'JPY',
    });
    await writePocketBudgetCell({
      lane,
      month: '2017-02',
      pair: {
        native: 10000,
        base: null,
        encoding: 'JPY.0',
        captureDate: '2017-01-10',
      },
    });
    expect(cell(`201702-${lane}`)).toMatchObject({
      budget_pair: '10000:~JPY.0@2017-01-10',
      amount: 10000,
      base_amount: null,
      capture_date: '2017-01-10',
    });
    expect(
      await writePocketBudgetCell({
        lane,
        month: '2017-03',
        pair: {
          native: 1,
          base: 1,
          encoding: 'IQD.0',
          captureDate: '2017-03-31',
        },
      }),
    ).toEqual({ status: 'encoding-mismatch' });
    expect(cell(`201703-${lane}`)).toBeNull();
  });

  it('derives an unknown native from a stamp in another currency', async () => {
    const { id: lane } = await createPocket({
      category: 'food',
      currency: 'JPY',
    });
    await applyMessages([
      remote('pocket_budgets', `201702-${lane}`, 'month', 201702),
      remote('pocket_budgets', `201702-${lane}`, 'lane', lane),
      remote(
        'pocket_budgets',
        `201702-${lane}`,
        'budget_pair',
        '4000:4000~KWD.3@2017-02-28',
      ),
    ]);
    expect(cell(`201702-${lane}`)).toMatchObject({
      amount: null,
      amount_encoding: 'KWD.3',
      base_amount: null,
    });
    // Unknown is never zero: the lane stays active.
    expect(resolution(lane)).toMatchObject({ status: 'live', active: 1 });
  });

  it('judges a cell again when its lane arrives later', async () => {
    await applyMessages([
      remote('pocket_budgets', '201701-late', 'month', 201701),
      remote('pocket_budgets', '201701-late', 'lane', 'late'),
      remote(
        'pocket_budgets',
        '201701-late',
        'budget_pair',
        '700:7~JPY.0@2017-01-31',
      ),
    ]);
    expect(cell('201701-late')).toMatchObject({ amount: 700, base_amount: 7 });
    await applyMessages(remoteLane('late', 'food', 'KWD.3'));
    expect(cell('201701-late')).toMatchObject({
      amount: null,
      base_amount: null,
      amount_encoding: 'JPY.0',
    });
  });

  it('undoes and redoes a first write and an existing cell exactly', async () => {
    const { id: lane } = await createPocket({
      category: 'food',
      currency: 'JPY',
    });
    const write = (native: number, base: number | null, captureDate: string) =>
      runMutator(() =>
        withUndo(() =>
          writePocketBudgetCell({
            lane,
            month: '2017-01',
            pair: { native, base, encoding: 'JPY.0', captureDate },
          }),
        ),
      );
    const id = `201701-${lane}`;

    await write(4000, 40, '2017-01-31');
    await undo();
    // Absent again: no authority, no amounts, not active.
    expect(cell(id)).toMatchObject({
      budget_pair: null,
      amount: null,
      amount_encoding: null,
      base_amount: null,
      capture_date: null,
    });
    expect(resolution(lane)).toMatchObject({ active: 0 });
    await redo();
    expect(cell(id)).toMatchObject({
      budget_pair: '4000:40~JPY.0@2017-01-31',
      amount: 4000,
      base_amount: 40,
    });

    // A later pending write over it restores the frozen pair and its
    // capture date on undo, without recapturing.
    await write(9000, null, '2017-02-14');
    await undo();
    expect(cell(id)).toMatchObject({
      budget_pair: '4000:40~JPY.0@2017-01-31',
      amount: 4000,
      base_amount: 40,
      capture_date: '2017-01-31',
    });
    await redo();
    expect(cell(id)).toMatchObject({
      budget_pair: '9000:~JPY.0@2017-02-14',
      base_amount: null,
      capture_date: '2017-02-14',
    });
  });

  it('keeps a remote cell under its emitted id, counted with its lane', async () => {
    // Two live Food JPY lanes from offline creation: the smaller id is
    // canonical and the other a duplicate.
    await applyMessages([
      ...remoteLane('jpy-a', 'food', 'JPY.0'),
      ...remoteLane('jpy-b', 'food', 'JPY.0'),
    ]);
    await applyMessages([
      remote('pocket_budgets', '201701-jpy-b', 'month', 201701),
      remote('pocket_budgets', '201701-jpy-b', 'lane', 'jpy-b'),
      remote(
        'pocket_budgets',
        '201701-jpy-b',
        'budget_pair',
        '300:3~JPY.0@2017-01-31',
      ),
    ]);
    expect(cell('201701-jpy-b')).toMatchObject({ lane: 'jpy-b', amount: 300 });
    expect(cell('201701-jpy-a')).toBeNull();
    expect(resolution('jpy-a')).toMatchObject({
      status: 'live',
      active: 0,
    });
    expect(resolution('jpy-b')).toMatchObject({
      status: 'duplicate',
      effective_owner: 'jpy-a',
      effective_category: 'food',
      active: 1,
    });
  });

  it('replays the log to the same cells in either arrival order', async () => {
    const { id: lane } = await createPocket({
      category: 'food',
      currency: 'IQD',
    });
    const writeCell = (month: string, native: number, encoding: string) =>
      writePocketBudgetCell({
        lane,
        month,
        pair: { native, base: native, encoding, captureDate: `${month}-28` },
      });
    await writeCell('2017-01', 2, 'IQD.0');
    await writeCell('2017-01', -500, 'IQD.3');
    await writeCell('2017-02', 2500, 'IQD.3');
    const cells = () =>
      db.runQuery(
        `SELECT id, lane, month, budget_pair, amount, amount_encoding,
           base_amount, capture_date FROM pocket_budgets ORDER BY id`,
        [],
        true,
      );
    const before = cells();
    expect(before).toHaveLength(2);
    await replayLog('forward');
    expect(cells()).toEqual(before);
    await replayLog('reverse');
    expect(cells()).toEqual(before);
  });
});

describe('slot resolution', () => {
  it('keeps a retirement when a lane is created offline later (DL5)', async () => {
    const { id: travelJpy } = await createPocket({
      category: 'travel',
      currency: 'JPY',
    });
    const { id: foodJpy } = await createPocket({
      category: 'food',
      currency: 'JPY',
    });
    await retireLane({ lane: travelJpy, owner: foodJpy });
    const retirements = () =>
      db.runQuery('SELECT * FROM slot_retirements', [], true);
    const before = retirements();
    // Device B, offline: a fresh Travel JPY lane, P0 hidden, and a later
    // assignment to P0.
    await applyMessages([
      ...remoteLane('travel-jpy-2', 'travel', 'JPY.0'),
      remote('category_slot_meta', travelJpy, 'hidden', 1),
    ]);
    await applyMessages([
      remote('pocket_budgets', `201702-${travelJpy}`, 'month', 201702),
      remote('pocket_budgets', `201702-${travelJpy}`, 'lane', travelJpy),
      remote(
        'pocket_budgets',
        `201702-${travelJpy}`,
        'budget_pair',
        '500:5~JPY.0@2017-02-28',
      ),
    ]);
    expect(await createPocket({ category: 'travel', currency: 'JPY' })).toEqual(
      { id: 'travel-jpy-2' },
    );
    expect(retirements()).toEqual(before);
    expect(resolution(travelJpy)).toEqual({
      status: 'retired',
      effective_category: 'food',
      effective_owner: foodJpy,
      active: 1,
    });
    expect(cell(`201702-${travelJpy}`)).toMatchObject({
      lane: travelJpy,
      amount: 500,
    });
    expect(resolution('travel-jpy-2')).toMatchObject({
      status: 'live',
      effective_category: 'travel',
    });
  });

  it('restores a retirement on undo and again on redo (DL6)', async () => {
    const { id: travelJpy } = await createPocket({
      category: 'travel',
      currency: 'JPY',
    });
    const { id: foodJpy } = await createPocket({
      category: 'food',
      currency: 'JPY',
    });
    await runMutator(() =>
      withUndo(() => retireLane({ lane: travelJpy, owner: foodJpy })),
    );
    expect(resolution(travelJpy)).toMatchObject({ status: 'retired' });
    await undo();
    expect(resolution(travelJpy)).toMatchObject({
      status: 'live',
      effective_category: 'travel',
      effective_owner: travelJpy,
    });
    await redo();
    expect(resolution(travelJpy)).toMatchObject({
      status: 'retired',
      effective_category: 'food',
    });
  });

  it.each(['A first', 'B first'])(
    'counts a retirement cycle as unresolved, %s (DL7, AT9)',
    async order => {
      await applyMessages([
        ...remoteLane('lane-a', 'travel', 'JPY.0'),
        ...remoteLane('lane-b', 'food', 'JPY.0'),
      ]);
      await batchUpdateTransactions({
        added: [yen('t', 'jpy', -3000, 'travel')],
      });
      expect(stored('t').pocket).toBe('lane-a');
      const ab = remote('slot_retirements', 'lane-a', 'owner', 'lane-b');
      const ba = remote('slot_retirements', 'lane-b', 'owner', 'lane-a');
      const tombstones = [
        remote('slot_retirements', 'lane-a', 'tombstone', 0),
        remote('slot_retirements', 'lane-b', 'tombstone', 0),
      ];
      for (const batch of order === 'A first' ? [[ab], [ba]] : [[ba], [ab]]) {
        await applyMessages(batch);
      }
      await applyMessages(tombstones);
      const expectCycle = async () => {
        expect(resolution('lane-a')).toMatchObject({
          status: 'unresolved',
          effective_category: 'travel',
          effective_owner: null,
          active: 1,
        });
        expect(resolution('lane-b')).toMatchObject({
          status: 'unresolved',
          effective_category: 'food',
          effective_owner: null,
        });
        // Still counted in its lane, shown under its live origin category.
        expect(laneOf('t')).toBe('lane-a');
        expect(await shownCategory('t')).toBe('travel');
      };
      await expectCycle();
      // Deferred replay of the whole log gives the same state.
      await replayLog(order === 'A first' ? 'forward' : 'reverse');
      await expectCycle();
    },
  );

  it('clears the pointer of an unresolved row moved into another encoding', async () => {
    await applyMessages([
      ...remoteLane('lane-a', 'travel', 'JPY.0'),
      ...remoteLane('lane-b', 'food', 'JPY.0'),
    ]);
    await batchUpdateTransactions({
      added: [yen('t', 'jpy', -3000, 'travel')],
    });
    await applyMessages([
      remote('category_mapping', 'travel', 'transferId', 'food'),
      remote('categories', 'travel', 'tombstone', 1),
      remote('slot_retirements', 'lane-a', 'owner', 'lane-b'),
      remote('slot_retirements', 'lane-b', 'owner', 'lane-a'),
      remote('slot_retirements', 'lane-a', 'tombstone', 0),
      remote('slot_retirements', 'lane-b', 'tombstone', 0),
    ]);
    // Origin Travel is deleted, so the cycle falls back to its mapping.
    expect(resolution('lane-a')).toMatchObject({
      status: 'unresolved',
      effective_category: 'food',
    });
    await db.update('categories', { id: 'food', tombstone: 1 });
    expect(resolution('lane-a')).toMatchObject({
      status: 'unresolved',
      effective_category: null,
    });
    expect(
      await move({
        id: 't',
        account: 'kwd',
        expected: expectedOf('t'),
        transaction_amount: -9000,
        baseAmount: -3000,
      }),
    ).toMatchObject({ status: 'ok', reason: 'owner-unresolved' });
    // The raw category stays and rules 2 and 3 apply.
    expect(stored('t')).toMatchObject({ category: 'travel', pocket: null });
  });

  it('keeps a known owner category for an acyclic unresolved chain', async () => {
    const { id: travelJpy } = await createPocket({
      category: 'travel',
      currency: 'JPY',
    });
    const { id: foodJpy } = await createPocket({
      category: 'food',
      currency: 'JPY',
    });
    await batchUpdateTransactions({
      added: [yen('t', 'jpy', -3000, 'travel')],
    });
    await retireLane({ lane: travelJpy, owner: foodJpy });
    await applyMessages([remote('category_pockets', foodJpy, 'tombstone', 1)]);
    // No cycle: Food is the known owner and stays live.
    expect(resolution(travelJpy)).toEqual({
      status: 'unresolved',
      effective_category: 'food',
      effective_owner: null,
      active: 1,
    });
    expect(laneOf('t')).toBe(travelJpy);
    expect(await shownCategory('t')).toBe('food');
  });

  it('resolves a nine-hop chain (DL8)', async () => {
    const lanes: string[] = [];
    for (let i = 0; i < 10; i++) {
      await db.insertCategory({
        id: `c${i}`,
        name: `c${i}`,
        cat_group: 'group',
      });
      lanes.push(
        (await createPocket({ category: `c${i}`, currency: 'JPY' })).id,
      );
    }
    for (let i = 0; i < 9; i++) {
      await retireLane({ lane: lanes[i], owner: lanes[i + 1] });
    }
    expect(resolution(lanes[0])).toEqual({
      status: 'retired',
      effective_category: 'c9',
      effective_owner: lanes[9],
      active: 0,
    });
  });

  it('chooses canonical lanes and base generations deterministically', async () => {
    await applyMessages([
      ...remoteLane('iqd-z', 'food', 'IQD.3'),
      ...remoteLane('iqd-a', 'food', 'IQD.0'),
    ]);
    // The largest precision wins over the smaller id.
    expect(resolution('iqd-z')).toMatchObject({ status: 'live' });
    expect(resolution('iqd-a')).toMatchObject({
      status: 'duplicate',
      effective_owner: 'iqd-z',
    });
    const b1 = await createBaseLane('food');
    expect(
      db.firstSync('SELECT generation FROM category_pockets WHERE id = ?', [
        b1,
      ]),
    ).toEqual({ generation: 1 });
    // The newer generation is current; generation 0 left live is a
    // duplicate of it.
    expect(resolution(b1)).toMatchObject({ status: 'live' });
    expect(resolution('food')).toMatchObject({
      status: 'duplicate',
      effective_owner: b1,
    });
    await retireLane({ lane: b1, owner: 'shop' });
    const b2 = await createBaseLane('food');
    expect(
      db.firstSync('SELECT generation FROM category_pockets WHERE id = ?', [
        b2,
      ]),
    ).toEqual({ generation: 2 });
  });

  describe.each(['budget', 'row'] as const)(
    'a late %s message after an empty deletion (W3, W4)',
    kind => {
      async function deletedShopLane() {
        const { id } = await createPocket({
          category: 'shop',
          currency: 'JPY',
        });
        // Empty lane: tombstoned without retirement.
        await db.update('category_pockets', { id, tombstone: 1 });
        expect(resolution(id)).toMatchObject({
          status: 'unresolved',
          active: 0,
        });
        return id;
      }
      async function lateMessage(lane: string) {
        if (kind === 'budget') {
          await applyMessages([
            remote('pocket_budgets', `201703-${lane}`, 'month', 201703),
            remote('pocket_budgets', `201703-${lane}`, 'lane', lane),
            remote(
              'pocket_budgets',
              `201703-${lane}`,
              'budget_pair',
              '1000:~JPY.0@2017-01-01',
            ),
          ]);
        } else {
          await applyMessages(
            remoteRow('late', {
              acct: 'jpy',
              date: 20170112,
              amount: -1000,
              transaction_amount: -1000,
              amount_pair: amountPair(-1000, -1000, 'jpy', 'JPY.0'),
              category: 'shop',
              pocket: lane,
              isParent: 0,
              isChild: 0,
              tombstone: 0,
            }),
          );
        }
      }
      const expected = {
        status: 'unresolved',
        effective_category: 'shop',
        effective_owner: null,
        active: 1,
      };

      it('is counted and unresolved on a warm read and after reload', async () => {
        const lane = await deletedShopLane();
        await lateMessage(lane);
        expect(resolution(lane)).toEqual(expected);
        if (kind === 'row') expect(laneOf('late')).toBe(lane);
        reload();
        expect(resolution(lane)).toEqual(expected);
      });

      it.each(['forward', 'reverse'] as const)(
        'is counted and unresolved after a %s replay',
        async order => {
          const lane = await deletedShopLane();
          await lateMessage(lane);
          await replayLog(order);
          expect(resolution(lane)).toEqual(expected);
          if (kind === 'row') {
            expect(laneOf('late')).toBe(lane);
            expect(await shownCategory('late')).toBe('shop');
          }
        },
      );
    },
  );

  it('shows a base slot with history, else after activity or Add Currency (B5)', async () => {
    await batchUpdateTransactions({
      added: [
        {
          id: 'f',
          account: 'usd',
          date: '2017-01-05',
          amount: -500,
          category: 'food',
        },
      ],
    });
    await createPocket({ category: 'food', currency: 'JPY' });
    expect(
      db.firstSync('SELECT shown FROM category_slot_meta WHERE id = ?', [
        'food',
      ]),
    ).toEqual({ shown: 1 });
    expect(baseSlotShown('food')).toBe(true);

    await createPocket({ category: 'shop', currency: 'JPY' });
    expect(
      db.firstSync('SELECT shown FROM category_slot_meta WHERE id = ?', [
        'shop',
      ]),
    ).toBeNull();
    expect(baseSlotShown('shop')).toBe(false);
    // Add Currency in the budget currency shows the current base slot.
    expect(await createPocket({ category: 'shop', currency: 'USD' })).toEqual({
      id: 'shop',
    });
    expect(baseSlotShown('shop')).toBe(true);

    await createPocket({ category: 'travel', currency: 'JPY' });
    expect(baseSlotShown('travel')).toBe(false);
    await batchUpdateTransactions({
      added: [
        {
          id: 'r',
          account: 'usd',
          date: '2017-01-05',
          amount: -500,
          category: 'travel',
        },
      ],
    });
    expect(baseSlotShown('travel')).toBe(true);
  });
});

describe('attribution and write intent', () => {
  let travelJpy: string;
  let foodJpy: string;

  beforeEach(async () => {
    travelJpy = (await createPocket({ category: 'travel', currency: 'JPY' }))
      .id;
    foodJpy = (await createPocket({ category: 'food', currency: 'JPY' })).id;
  });

  it('routes inserts from their category and stamp', async () => {
    await batchUpdateTransactions({
      added: [
        yen('t', 'jpy', -3000, 'travel'),
        {
          id: 'u',
          account: 'usd',
          date: '2017-01-12',
          amount: -500,
          category: 'travel',
        },
        { ...yen('k', 'kwd', -9000, 'travel'), amount: -3000 },
      ],
    });
    expect(stored('t')).toMatchObject({
      category: 'travel',
      pocket: travelJpy,
      pair_encoding: 'JPY.0',
    });
    expect(laneOf('t')).toBe(travelJpy);
    // No KWD lane and no base generation: the category's own lane.
    expect(stored('u')).toMatchObject({ category: 'travel', pocket: null });
    expect(laneOf('u')).toBe('travel');
    expect(stored('k')).toMatchObject({ category: 'travel', pocket: null });
    expect(laneOf('k')).toBe('travel');
  });

  describe('a row in a retired pocket', () => {
    beforeEach(async () => {
      await batchUpdateTransactions({
        added: [yen('t', 'jpy', -3000, 'travel')],
      });
      await retireLane({ lane: travelJpy, owner: foodJpy });
    });

    const keepsLane = async () => {
      expect(stored('t')).toMatchObject({
        category: 'travel',
        pocket: travelJpy,
      });
      expect(laneOf('t')).toBe(travelJpy);
      expect(await shownCategory('t')).toBe('food');
    };

    it('reads the effective category everywhere', async () => {
      await keepsLane();
      expect(
        db.firstSync('SELECT category FROM v_transactions WHERE id = ?', ['t']),
      ).toEqual({ category: 'food' });
    });

    it('keeps the lane through notes, a resent category and dates (AT1-AT3)', async () => {
      // keepsLane asserts the lane after each step.
      expect.hasAssertions();
      await batchUpdateTransactions({ updated: [{ id: 't', notes: 'x' }] });
      await keepsLane();
      await batchUpdateTransactions({
        updated: [{ id: 't', category: 'food' }],
      });
      await keepsLane();
      await batchUpdateTransactions({
        updated: [{ id: 't', date: '2017-01-20' }],
      });
      await keepsLane();
    });

    it('keeps the lane through an amount edit (AT4)', async () => {
      expect(
        await editForeign({
          id: 't',
          expected: expectedOf('t'),
          transaction_amount: -4000,
          baseAmount: -4000,
        }),
      ).toEqual({ status: 'ok' });
      expect(stored('t')).toMatchObject({
        transaction_amount: -4000,
        pair_encoding: 'JPY.0',
      });
      await keepsLane();
    });

    it('routes an explicit category change (AT5)', async () => {
      const { id: shopJpy } = await createPocket({
        category: 'shop',
        currency: 'JPY',
      });
      await batchUpdateTransactions({
        updated: [{ id: 't', category: 'shop' }],
      });
      expect(stored('t')).toMatchObject({ category: 'shop', pocket: shopJpy });
      expect(laneOf('t')).toBe(shopJpy);
      expect(await shownCategory('t')).toBe('shop');
    });

    it('leaves every lane on a remote off-budget move (AT6)', async () => {
      await createAllBudgets();
      await sheet.waitOnSpreadsheet();
      expect(sumAmount('2017-01', 'food')).toBe(-3000);
      await applyMessages([remote('accounts', 'jpy', 'offbudget', 1)]);
      await sheet.waitOnSpreadsheet();
      expect(laneOf('t')).toBeNull();
      expect(sumAmount('2017-01', 'food')).toBe(0);
      expect(sumAmount('2017-01', 'travel')).toBe(0);
    });

    it('sums by effective category in tracking and keeps lanes (AT8)', async () => {
      await createAllBudgets();
      const rows = () =>
        db.runQuery(
          'SELECT id, category, pocket, amount_pair FROM transactions ORDER BY id',
          [],
          true,
        );
      const before = rows();
      await setType('tracking');
      await sheet.waitOnSpreadsheet();
      expect(sumAmount('2017-01', 'food')).toBe(-3000);
      expect(sumAmount('2017-01', 'travel')).toBe(0);
      await setType('envelope');
      await sheet.waitOnSpreadsheet();
      expect(rows()).toEqual(before);
      await keepsLane();
    });

    it('shows the owner category when the owner becomes income (AT7 variant)', async () => {
      await db.update('categories', {
        id: 'food',
        is_income: 1,
        cat_group: 'incomeGroup',
      });
      expect(laneOf('t')).toBeNull();
      expect(await shownCategory('t')).toBe('food');
    });

    it('keeps warm totals fresh when the account is tombstoned remotely', async () => {
      await createAllBudgets();
      await expectWarmSums(['food', 'travel']);
      expect(sumAmount('2017-01', 'food')).toBe(-3000);
      await applyMessages([remote('accounts', 'jpy', 'tombstone', 1)]);
      expect(laneOf('t')).toBeNull();
      await expectWarmSums(['food', 'travel']);
    });

    it('keeps warm totals fresh when the account encoding changes remotely', async () => {
      // A legacy row without a pair is stamped by its account's encoding.
      await applyMessages(
        remoteRow('legacy', {
          acct: 'jpy',
          date: 20170112,
          amount: -700,
          transaction_amount: -700,
          category: 'travel',
          pocket: travelJpy,
          isParent: 0,
          isChild: 0,
          tombstone: 0,
        }),
      );
      expect(laneOf('legacy')).toBe(travelJpy);
      await createAllBudgets();
      await expectWarmSums(['food', 'travel']);
      expect(sumAmount('2017-01', 'food')).toBe(-3700);
      await applyMessages([remote('accounts', 'jpy', 'encoding', 'JPY.3')]);
      // JPY.0 no longer admits the account's stamp; the stamped row stays.
      expect(laneOf('legacy')).toBe('travel');
      expect(laneOf('t')).toBe(travelJpy);
      await expectWarmSums(['food', 'travel']);
    });

    it('moves the attribution when a retirement arrives', async () => {
      await createAllBudgets();
      await sheet.waitOnSpreadsheet();
      expect(sumAmount('2017-01', 'food')).toBe(-3000);
      expect(sumAmount('2017-01', 'travel')).toBe(0);
      await applyMessages([
        remote('slot_retirements', travelJpy, 'tombstone', 1),
      ]);
      await sheet.waitOnSpreadsheet();
      expect(await shownCategory('t')).toBe('travel');
      expect(sumAmount('2017-01', 'food')).toBe(0);
      expect(sumAmount('2017-01', 'travel')).toBe(-3000);
    });

    it.each([false, true])(
      'keeps a same-encoding move, closed %s (AM1, AM6)',
      async closed => {
        if (closed) await db.update('accounts', { id: 'jpy2', closed: 1 });
        await batchUpdateTransactions({
          updated: [{ id: 't', account: 'jpy2' }],
        });
        expect(stored('t').acct).toBe('jpy2');
        await keepsLane();
        await batchUpdateTransactions({ updated: [{ id: 't', notes: 'n' }] });
        await keepsLane();
      },
    );

    it.each([false, true])(
      'reroutes a cross-encoding move from the effective category, closed %s (AM2, AM7)',
      async closed => {
        if (closed) await db.update('accounts', { id: 'kwd', closed: 1 });
        expect(
          await move({
            id: 't',
            account: 'kwd',
            expected: expectedOf('t'),
            transaction_amount: -9000,
            baseAmount: -3000,
          }),
        ).toMatchObject({ status: 'ok' });
        expect(stored('t')).toMatchObject({
          acct: 'kwd',
          category: 'food',
          pocket: null,
          pair_encoding: 'KWD.3',
        });
        expect(laneOf('t')).toBe('food');
        expect(await shownCategory('t')).toBe('food');
        await batchUpdateTransactions({ updated: [{ id: 't', notes: 'n' }] });
        expect(laneOf('t')).toBe('food');
      },
    );

    it('points a cross-encoding move at a pocket of the effective category (AM2)', async () => {
      const { id: foodKwd } = await createPocket({
        category: 'food',
        currency: 'KWD',
      });
      expect(
        await move({
          id: 't',
          account: 'kwd',
          expected: expectedOf('t'),
          transaction_amount: -9000,
          baseAmount: -3000,
        }),
      ).not.toHaveProperty('reason');
      expect(stored('t')).toMatchObject({ category: 'food', pocket: foodKwd });
      expect(laneOf('t')).toBe(foodKwd);
    });

    it('clears the category on an off-budget move (AM5)', async () => {
      await batchUpdateTransactions({
        updated: [{ id: 't', account: 'jpyOff' }],
      });
      expect(stored('t')).toMatchObject({ category: null, pocket: null });
      expect(laneOf('t')).toBeNull();
    });

    it('changes no lane on a remote closed flag (AM8)', async () => {
      // keepsLane asserts the lane after each step.
      expect.hasAssertions();
      await applyMessages([remote('accounts', 'jpy', 'closed', 1)]);
      await keepsLane();
      reload();
      await keepsLane();
      await replayLog('reverse');
      await keepsLane();
    });
  });

  it('keeps base-lane rows through moves after a base-child cutover (AM3)', async () => {
    await createPocket({ category: 'travel', currency: 'KWD' });
    await db.update('category_pockets', { id: travelJpy, tombstone: 1 });
    await batchUpdateTransactions({
      added: [yen('r', 'jpy', -3000, 'travel')],
    });
    expect(stored('r').pocket).toBeNull();
    await retireLane({ lane: 'travel', owner: 'food' });
    const b1 = await createBaseLane('travel');
    expect(resolution(b1)).toMatchObject({ status: 'live' });
    const inRetiredLane = async () => {
      expect(stored('r')).toMatchObject({ category: 'travel', pocket: null });
      expect(laneOf('r')).toBe('travel');
      expect(await shownCategory('r')).toBe('food');
    };
    await inRetiredLane();
    await batchUpdateTransactions({ updated: [{ id: 'r', account: 'jpy2' }] });
    await inRetiredLane();
    await move({
      id: 'r',
      account: 'usd',
      expected: expectedOf('r'),
      transaction_amount: -3000,
    });
    expect(stored('r')).toMatchObject({ acct: 'usd', pair_encoding: '' });
    await inRetiredLane();
    await batchUpdateTransactions({ updated: [{ id: 'r', notes: 'n' }] });
    await inRetiredLane();
    // New rows of Travel route to its next generation.
    await batchUpdateTransactions({
      added: [
        {
          id: 'n',
          account: 'usd',
          date: '2017-01-12',
          amount: -100,
          category: 'travel',
        },
      ],
    });
    expect(stored('n').pocket).toBe(b1);
    expect(laneOf('n')).toBe(b1);
  });

  it('keeps and reroutes rows of a whole-parent retirement (AM4)', async () => {
    await batchUpdateTransactions({
      added: [yen('r', 'jpy', -1000, 'travel')],
    });
    await retireLane({ lane: travelJpy, owner: foodJpy });
    await retireLane({ lane: 'travel', owner: 'food' });
    await db.update('category_mapping', { id: 'travel', transferId: 'food' });
    await db.update('categories', { id: 'travel', tombstone: 1 });
    await batchUpdateTransactions({ updated: [{ id: 'r', account: 'jpy2' }] });
    expect(stored('r')).toMatchObject({
      category: 'travel',
      pocket: travelJpy,
    });
    expect(laneOf('r')).toBe(travelJpy);
    expect(await shownCategory('r')).toBe('food');
    await move({
      id: 'r',
      account: 'kwd',
      expected: expectedOf('r'),
      transaction_amount: -3000,
      baseAmount: -1000,
    });
    expect(stored('r')).toMatchObject({ category: 'food', pocket: null });
    expect(laneOf('r')).toBe('food');
  });

  it('restores the raw category and pointer on undo', async () => {
    await batchUpdateTransactions({
      added: [yen('r', 'jpy', -1000, 'travel')],
    });
    await retireLane({ lane: travelJpy, owner: foodJpy });
    await db.update('category_mapping', { id: 'travel', transferId: 'food' });
    await db.update('categories', { id: 'travel', tombstone: 1 });
    await runMutator(() =>
      withUndo(() =>
        batchUpdateTransactions({ updated: [{ id: 'r', category: 'shop' }] }),
      ),
    );
    expect(stored('r')).toMatchObject({ category: 'shop', pocket: null });
    await undo();
    expect(stored('r')).toMatchObject({
      category: 'travel',
      pocket: travelJpy,
    });
    expect(laneOf('r')).toBe(travelJpy);
    expect(await shownCategory('r')).toBe('food');
  });

  it('shows the owner category of a retired base lane made income', async () => {
    await batchUpdateTransactions({
      added: [
        {
          id: 'u',
          account: 'usd',
          date: '2017-01-12',
          amount: -500,
          category: 'travel',
        },
      ],
    });
    await retireLane({ lane: 'travel', owner: 'food' });
    await createBaseLane('travel');
    expect(laneOf('u')).toBe('travel');
    expect(await shownCategory('u')).toBe('food');
    await db.update('categories', {
      id: 'food',
      is_income: 1,
      cat_group: 'incomeGroup',
    });
    expect(laneOf('u')).toBeNull();
    expect(await shownCategory('u')).toBe('food');
  });

  it.each(['full update', 'category only'] as const)(
    'routes a %s by the stored stamp after the account encoding changed',
    async kind => {
      const { id: shopJpy } = await createPocket({
        category: 'shop',
        currency: 'JPY',
      });
      await batchUpdateTransactions({
        added: [yen('t', 'jpy', -3000, 'travel')],
      });
      expect(stored('t')).toMatchObject({
        pocket: travelJpy,
        pair_encoding: 'JPY.0',
      });
      await applyMessages([remote('accounts', 'jpy', 'encoding', 'JPY.3')]);
      await batchUpdateTransactions({
        updated: [
          kind === 'full update'
            ? {
                id: 't',
                account: 'jpy',
                amount: -3000,
                transaction_amount: -3000,
                category: 'shop',
              }
            : { id: 't', category: 'shop' },
        ],
      });
      expect(stored('t')).toMatchObject({
        category: 'shop',
        pocket: shopJpy,
        pair_encoding: 'JPY.0',
      });
      expect(laneOf('t')).toBe(shopJpy);
    },
  );

  it('leaves lanes for a category made income (AT7)', async () => {
    await batchUpdateTransactions({
      added: [yen('t', 'jpy', -3000, 'travel')],
    });
    expect(laneOf('t')).toBe(travelJpy);
    await db.update('categories', { id: 'travel', is_income: 1 });
    expect(laneOf('t')).toBeNull();
    expect(await shownCategory('t')).toBe('travel');
  });

  describe('older clients', () => {
    beforeEach(() =>
      batchUpdateTransactions({ added: [yen('t', 'jpy', -3000, 'travel')] }),
    );

    it('moves a row by a category-only edit (OC1)', async () => {
      await applyMessages([remote('transactions', 't', 'category', 'food')]);
      expect(stored('t')).toMatchObject({
        category: 'food',
        pocket: travelJpy,
      });
      // Food's own lane, even though Food JPY exists.
      expect(laneOf('t')).toBe('food');
      expect(await shownCategory('t')).toBe('food');
    });

    it.each(['older last', 'older first'])(
      'resolves concurrent edits coherently, %s (OC2)',
      async order => {
        const { id: shopJpy } = await createPocket({
          category: 'shop',
          currency: 'JPY',
        });
        const early = Timestamp.send()!;
        await batchUpdateTransactions({
          updated: [{ id: 't', category: 'shop' }],
        });
        await applyMessages([
          remote(
            'transactions',
            't',
            'category',
            'food',
            order === 'older first' ? early : Timestamp.send()!,
          ),
        ]);
        if (order === 'older last') {
          expect(stored('t')).toMatchObject({
            category: 'food',
            pocket: shopJpy,
          });
          expect(laneOf('t')).toBe('food');
        } else {
          expect(stored('t')).toMatchObject({
            category: 'shop',
            pocket: shopJpy,
          });
          expect(laneOf('t')).toBe(shopJpy);
        }
      },
    );

    it('counts a row moved to an income category as income (OC3)', async () => {
      await applyMessages([remote('transactions', 't', 'category', 'salary')]);
      expect(laneOf('t')).toBeNull();
      expect(await shownCategory('t')).toBe('salary');
    });

    it('keeps an orphan pocket of a legacy deletion counted (OC4)', async () => {
      await applyMessages([
        remote('category_mapping', 'travel', 'transferId', 'food'),
        remote('categories', 'travel', 'tombstone', 1),
      ]);
      expect(resolution(travelJpy)).toMatchObject({
        status: 'orphan',
        effective_category: 'food',
        effective_owner: foodJpy,
        active: 1,
      });
      expect(laneOf('t')).toBe(travelJpy);
      expect(await shownCategory('t')).toBe('food');
    });
  });
});
