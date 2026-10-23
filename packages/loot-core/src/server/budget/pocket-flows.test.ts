import { Timestamp } from '@actual-app/crdt';

import { installAPI } from '#server/api';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { deserializeValue } from '#server/sync/serialization';
import { clearUndo, undo } from '#server/undo';
import * as monthUtils from '#shared/months';
import type { Template } from '#types/models/templates';
import type { ServerHandlers } from '#types/server-handlers';

import * as actions from './actions';
import { app as budgetApp } from './app';
import { createAllBudgets, setType } from './base';
import { refreshFxChanges, stopFxDayWatch } from './fx-valuation';
import { applySingleCategoryTemplate, storeTemplates } from './goal-template';
import { readCategoryPockets } from './pocket-readers';
import {
  createBaseLane,
  createPocket,
  retireLane,
  writePocketBudgetCell,
} from './pockets';
import { reservationDetails } from './reservations';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

// MC-10.5 flows and automation: the U1 writer on every assignment path.
// Retirements are seeded through MC-10.1 storage; the deletion handlers are
// MC-10.6. Fixtures state their own today; every other month is past.
const clock = {
  set today(day: string) {
    global.currentDay = day;
    global.currentMonth = day.slice(0, 7);
  },
};

const handlers = budgetApp.handlers;
const api = installAPI(handlers as unknown as ServerHandlers);

const remote = (
  dataset: string,
  row: string,
  column: string,
  value: string | number | null,
): Message => ({
  dataset,
  row,
  column,
  value,
  timestamp: Timestamp.send()!,
});

/** A foreign lane with a known id, as another device created it. */
async function lane(id: string, category: string, encoding: string) {
  await applyMessages([
    remote('category_pockets', id, 'category', category),
    remote('category_pockets', id, 'kind', 'foreign'),
    remote('category_pockets', id, 'encoding', encoding),
    remote('category_pockets', id, 'tombstone', 0),
  ]);
}

async function assign(
  laneId: string,
  month: string,
  native: number,
  base: number | null,
  captureDate: string,
  encoding: string,
) {
  expect(
    await writePocketBudgetCell({
      lane: laneId,
      month,
      pair: { native, base, encoding, captureDate },
    }),
  ).toEqual({ status: 'ok' });
}

/** A cell another device wrote. */
const remoteCell = (laneId: string, month: string, pair: string) => {
  const id = `${month.replace('-', '')}-${laneId}`;
  return applyMessages([
    remote('pocket_budgets', id, 'month', Number(month.replace('-', ''))),
    remote('pocket_budgets', id, 'lane', laneId),
    remote('pocket_budgets', id, 'budget_pair', pair),
  ]);
};

let rowId = 0;
async function row(
  account: string,
  date: string,
  base: number,
  native: number | null,
  category: string | null,
) {
  const id = `row${rowId++}`;
  await db.insertTransaction({
    id,
    account,
    date,
    amount: base,
    ...(native !== null && { transaction_amount: native }),
    category,
  });
  return id;
}
const income = (
  account: string,
  date: string,
  base: number,
  native: number | null,
) => row(account, date, base, native, 'salary');

async function standing(currency: string, rate: string, date: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency: currency,
    rate,
    kind: 'standing',
    date,
    replace: true,
  });
}

async function refresh() {
  await createAllBudgets();
  await refreshFxChanges();
  await sheet.waitOnSpreadsheet();
}

const value = (month: string, name: string) =>
  sheet.getCellValue(monthUtils.sheetForMonth(month), name);
const toBudget = (month: string) => Number(value(month, 'to-budget'));

function currency(month: string, code: string) {
  const found = reservationDetails(month).find(c => c.currency === code);
  if (!found) throw new Error(`no ${code} reservation in ${month}`);
  return found;
}

const cell = (laneId: string, month: string) =>
  db.firstSync<{
    budget_pair: string | null;
    amount: number | null;
    amount_encoding: string | null;
    base_amount: number | null;
    capture_date: string | null;
    carryover: number | null;
  }>(
    `SELECT budget_pair, amount, amount_encoding, base_amount, capture_date,
       carryover FROM pocket_budgets WHERE id = ?`,
    [`${month.replace('-', '')}-${laneId}`],
  );
const zeroBudget = (category: string, month: string) =>
  db.firstSync<{ amount: number | null; carryover: number | null }>(
    'SELECT amount, carryover FROM zero_budgets WHERE id = ?',
    [`${month.replace('-', '')}-${category}`],
  );
const count = (table: string) =>
  db.firstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)!.n;

/** The slot a category shows for a pocket, as the budget reads it. */
async function slot(month: string, category: string, pocketId: string) {
  const entry = (await readCategoryPockets(month)).get(category);
  const found = entry?.pockets.find(p => p.id === pocketId);
  if (!found) throw new Error(`no slot ${pocketId} in ${category}`);
  return found;
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
  clock.today = '2026-06-15';
  rowId = 0;
  await setup();
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'iqd3', name: 'Iraqi dinar 3', currency: 'IQD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await applyMessages([remote('accounts', 'iqd3', 'encoding', 'IQD.3')]);
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
  global.currentDay = null;
  global.currentMonth = null;
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
    return;
  }
  // Every message in reverse, one at a time, except that each upstream
  // zero_budgets row arrives whole: its handler needs the row's month with
  // its category.
  const rows = new Map<string, typeof log>();
  for (const message of log) {
    const key =
      message.dataset === 'zero_budgets'
        ? `${message.dataset}:${message.row}`
        : `${message.timestamp.toString()}`;
    rows.set(key, [...(rows.get(key) ?? []), message]);
  }
  for (const batch of [...rows.values()].reverse()) {
    await applyMessages(batch);
  }
}

describe('writable precision (U1)', () => {
  // Standing 1 IQD per USD; one IQD.3 account +1000.000 / +1000.00; Travel's
  // IQD.3 lane assigns January 0.500 frozen 0.50; Food has a live empty
  // IQD.0 lane (carry off).
  async function wpSetup() {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('travelIqd', 'travel', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('travelIqd', '2026-01', 500, 50, '2026-01-31', 'IQD.3');
    await refresh();
  }

  /** WP1's deletion, seeded: Travel's lane retired into Food's IQD slot. */
  async function retireTravel() {
    await retireLane({ lane: 'travelIqd', owner: 'foodIqd' });
    await refresh();
  }

  it('WP1 coarse destination set zero', async () => {
    await wpSetup();
    expect(toBudget('2026-01')).toBe(99950);
    await retireTravel();
    expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
      precision: 3,
      budgeted: 500,
    });
    expect(currency('2026-01', 'IQD')).toMatchObject({
      pocketTotal: 50,
      writtenChange: 50,
    });
    expect(toBudget('2026-01')).toBe(99950);
    const lanes = count('category_pockets');
    const retirements = count('slot_retirements');

    await handlers['budget/set-zero']({ month: '2026-01' });
    await refresh();

    // -0.500 is not an integer at IQD.0: the largest recorded precision.
    expect(cell('foodIqd', '2026-01')).toMatchObject({
      budget_pair: '-500:-50~IQD.3@2026-01-31',
      amount: -500,
      amount_encoding: 'IQD.3',
      base_amount: -50,
    });
    expect(cell('travelIqd', '2026-01')?.budget_pair).toBe(
      '500:50~IQD.3@2026-01-31',
    );
    expect(
      db.runQuery(
        'SELECT id, encoding FROM category_pockets ORDER BY id',
        [],
        true,
      ),
    ).toEqual([
      { id: 'foodIqd', encoding: 'IQD.0' },
      { id: 'travelIqd', encoding: 'IQD.3' },
    ]);
    expect(count('category_pockets')).toBe(lanes);
    expect(count('slot_retirements')).toBe(retirements);
    expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
      precision: 3,
      budgeted: 0,
    });
    expect(currency('2026-01', 'IQD')).toMatchObject({
      reserved: 0,
      rule: 1,
      pocketTotal: 0,
      writtenChange: 0,
    });
    expect(toBudget('2026-01')).toBe(100000);

    // February: Food's own -0.500 resets, Travel's +0.500 carries.
    const february = currency('2026-02', 'IQD');
    expect(february).toMatchObject({
      reserved: 500,
      pocketTotal: 50,
      writtenChange: 50,
    });
    expect(toBudget('2026-02')).toBe(99950);
    const laneOf = (id: string) => february.lanes.find(l => l.laneId === id);
    expect(laneOf('travelIqd')).toMatchObject({ carryIn: 500, reset: 0 });
    expect(laneOf('foodIqd')).toMatchObject({ carryIn: 0, reset: -500 });
  });

  it('WP2 coarse destination copy', async () => {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('travelIqd', 'travel', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('foodIqd', '2025-12', 2, 200, '2025-12-31', 'IQD.0');
    await assign('travelIqd', '2025-12', 500, 50, '2025-12-31', 'IQD.3');
    await retireLane({ lane: 'travelIqd', owner: 'foodIqd' });
    await refresh();
    expect(await slot('2025-12', 'food', 'foodIqd')).toMatchObject({
      budgeted: 2500,
    });

    await handlers['budget/copy-previous-month']({ month: '2026-01' });
    // 2.500 IQD at standing 1 is 2.50 in the budget currency.
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
      '2500:250~IQD.3@2026-01-31',
    );
    await refresh();
    expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
      budgeted: 2500,
    });
  });

  it('WP2 uses the lane encoding whenever the own amount is exact there', async () => {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('travelIqd', 'travel', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('foodIqd', '2025-12', 2, 200, '2025-12-31', 'IQD.0');
    await assign('travelIqd', '2025-12', 500, 50, '2025-12-31', 'IQD.3');
    await assign('travelIqd', '2026-01', 500, 50, '2026-01-31', 'IQD.3');
    await retireLane({ lane: 'travelIqd', owner: 'foodIqd' });
    await refresh();

    await handlers['budget/copy-previous-month']({ month: '2026-01' });
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
      '2:200~IQD.0@2026-01-31',
    );
  });

  it('WP3 exact flow into a coarse lane', async () => {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('shopIqd', 'shop', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('shopIqd', '2026-01', 1250, 125, '2026-01-31', 'IQD.3');
    await assign('foodIqd', '2026-01', 1, 100, '2026-01-31', 'IQD.0');
    await refresh();
    const before = currency('2026-01', 'IQD');
    const toBudgetBefore = toBudget('2026-01');

    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'shopIqd',
        to: 'foodIqd',
        amount: { amount: 250, encoding: 'IQD.3' },
      }),
    ).toEqual({ status: 'ok' });
    // Bases are recaptured at the flow's capture date (standing 1 here).
    expect(cell('shopIqd', '2026-01')).toMatchObject({
      amount: 1000,
      amount_encoding: 'IQD.3',
      capture_date: '2026-01-31',
    });
    expect(cell('foodIqd', '2026-01')).toMatchObject({
      amount: 1250,
      amount_encoding: 'IQD.3',
      capture_date: '2026-01-31',
    });
    await refresh();
    expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
      precision: 3,
      budgeted: 1250,
    });
    const after = currency('2026-01', 'IQD');
    expect(after.reserved).toBe(before.reserved);
    expect(after.pocketTotal).toBe(before.pocketTotal);
    expect(toBudget('2026-01')).toBe(toBudgetBefore);

    // Food's lane encoding stays IQD.0, so an IQD.3 row routes to its base.
    const id = await row('iqd3', '2026-01-20', -100, -1000, 'food');
    expect(
      db.firstSync('SELECT pocket FROM transactions WHERE id = ?', [id]),
    ).toEqual({ pocket: null });
  });

  describe('WP5 held write across a precision change', () => {
    it('reads the held amount at its own encoding', async () => {
      await wpSetup();
      // Another device's IQD.3 cell in another month: precision becomes 3.
      await remoteCell('foodIqd', '2026-02', '5:5~IQD.3@2026-02-28');
      expect(
        await handlers['budget/pocket-budget-set']({
          month: '2026-01',
          pocketId: 'foodIqd',
          amount: 1,
          encoding: 'IQD.0',
        }),
      ).toEqual({ status: 'ok' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '1:100~IQD.0@2026-01-31',
      );
      await refresh();
      expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
        precision: 3,
        budgeted: 1000,
      });
    });

    it('keeps the displayed target when an inherited lane arrives first', async () => {
      await wpSetup();
      await retireLane({ lane: 'travelIqd', owner: 'foodIqd' });
      expect(
        await handlers['budget/pocket-budget-set']({
          month: '2026-01',
          pocketId: 'foodIqd',
          amount: 1,
          encoding: 'IQD.0',
        }),
      ).toEqual({ status: 'ok' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '500:50~IQD.3@2026-01-31',
      );
      await refresh();
      expect(await slot('2026-01', 'food', 'foodIqd')).toMatchObject({
        budgeted: 1000,
      });
    });

    it('moves a held source amount at its encoding', async () => {
      await wpSetup();
      await assign('foodIqd', '2026-01', 1, 100, '2026-01-31', 'IQD.0');
      expect(
        await handlers['budget/pocket-transfer']({
          month: '2026-01',
          from: 'foodIqd',
          to: 'to-budget',
          amount: { amount: 250, encoding: 'IQD.3' },
        }),
      ).toEqual({ status: 'ok' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '750:75~IQD.3@2026-01-31',
      );
    });

    it('rejects another currency or an unsupported precision', async () => {
      await wpSetup();
      const before = count('messages_crdt');
      for (const encoding of ['JPY.0', 'IQD.16', 'IQD', '']) {
        expect(
          await handlers['budget/pocket-budget-set']({
            month: '2026-01',
            pocketId: 'foodIqd',
            amount: 1,
            encoding,
          }),
        ).toEqual({ status: 'encoding-mismatch' });
      }
      expect(
        await handlers['budget/pocket-transfer']({
          month: '2026-01',
          from: 'foodIqd',
          to: 'to-budget',
          amount: { amount: 1, encoding: 'JPY.0' },
        }),
      ).toEqual({ status: 'encoding-mismatch' });
      // A foreign amount without its encoding is not interpreted.
      expect(
        await handlers['budget/pocket-transfer']({
          month: '2026-01',
          from: 'foodIqd',
          to: 'to-budget',
          amount: 1,
        }),
      ).toEqual({ status: 'encoding-mismatch' });
      expect(cell('foodIqd', '2026-01')).toBeNull();
      expect(count('messages_crdt')).toBe(before);
    });

    it('asserts the same cases through the API', async () => {
      await wpSetup();
      await remoteCell('foodIqd', '2026-02', '5:5~IQD.3@2026-02-28');
      expect(
        await api['api/pocket-budget-set']({
          month: '2026-01',
          pocketId: 'foodIqd',
          amount: 1,
          encoding: 'IQD.0',
        }),
      ).toEqual({ status: 'ok' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '1:100~IQD.0@2026-01-31',
      );
      await retireLane({ lane: 'travelIqd', owner: 'foodIqd' });
      expect(
        await api['api/pocket-budget-set']({
          month: '2026-01',
          pocketId: 'foodIqd',
          amount: 1,
          encoding: 'IQD.0',
        }),
      ).toEqual({ status: 'ok' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '500:50~IQD.3@2026-01-31',
      );
      expect(
        await api['api/pocket-budget-set']({
          month: '2026-01',
          pocketId: 'foodIqd',
          amount: 1,
          encoding: 'JPY.0',
        }),
      ).toEqual({ status: 'encoding-mismatch' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '500:50~IQD.3@2026-01-31',
      );
      // A stale lane id writes its slot (the inherited Travel lane here).
      expect(
        await api['api/pocket-budget-set']({
          month: '2026-01',
          pocketId: 'travelIqd',
          amount: 2000,
          encoding: 'IQD.3',
        }),
      ).toEqual({ status: 'ok' });
      expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
        '1500:150~IQD.3@2026-01-31',
      );
      expect(cell('travelIqd', '2026-01')?.budget_pair).toBe(
        '500:50~IQD.3@2026-01-31',
      );
    });
  });

  it('WP4 sync, stale writers, undo and replay', async () => {
    await wpSetup();
    await retireTravel();
    const pairB = '500:50~IQD.3@2026-01-31';
    const pairA = '-500:-50~IQD.3@2026-01-31';

    // B sets the displayed January amount to 1.000; A applies Set zero
    // later, so A's whole pair wins the one cell.
    await handlers['budget/pocket-budget-set']({
      month: '2026-01',
      pocketId: 'foodIqd',
      amount: 1000,
      encoding: 'IQD.3',
    });
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(pairB);
    await handlers['budget/set-zero']({ month: '2026-01' });
    expect(cell('foodIqd', '2026-01')).toMatchObject({
      budget_pair: pairA,
      amount: -500,
      base_amount: -50,
    });
    await refresh();
    expect((await slot('2026-01', 'food', 'foodIqd')).budgeted).toBe(0);

    // B's write arrives as the later writer: B's whole pair wins.
    await remoteCell('foodIqd', '2026-01', pairB);
    expect(cell('foodIqd', '2026-01')).toMatchObject({
      budget_pair: pairB,
      amount: 500,
      amount_encoding: 'IQD.3',
      base_amount: 50,
      capture_date: '2026-01-31',
    });
    await refresh();
    expect((await slot('2026-01', 'food', 'foodIqd')).budgeted).toBe(1000);

    // A stale device C that never saw the deletion: target 2, inherited 0.
    await remoteCell('foodIqd', '2026-01', '2:200~IQD.0@2026-01-31');
    await refresh();
    expect((await slot('2026-01', 'food', 'foodIqd')).budgeted).toBe(2500);
    const lanes = count('category_pockets');
    const retirements = count('slot_retirements');
    await handlers['budget/set-zero']({ month: '2026-01' });
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(pairA);

    // Undo restores the cell's previous value and creates nothing.
    await undo();
    expect(cell('foodIqd', '2026-01')?.budget_pair).toBe(
      '2:200~IQD.0@2026-01-31',
    );
    expect(count('category_pockets')).toBe(lanes);
    expect(count('slot_retirements')).toBe(retirements);
    const final = cell('foodIqd', '2026-01');

    await replayLog('forward');
    expect(cell('foodIqd', '2026-01')).toEqual(final);
    await replayLog('reverse');
    expect(cell('foodIqd', '2026-01')).toEqual(final);
  });
});

describe('bulk actions (S9)', () => {
  /** Travel's base child retired into Food's base slot (a cutover). */
  async function retireTravelBase() {
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
  }

  it('BK1 set zero', async () => {
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 5000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 1000,
    });
    await retireTravelBase();
    await handlers['budget/set-zero']({ month: '2026-01' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(-5000);
    // The retired history keeps its assignment.
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(5000);
  });

  it('BK2 copy with unequal inheritance', async () => {
    await actions.setBudget({
      category: 'travel',
      month: '2025-12',
      amount: 5000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2025-12',
      amount: 5000,
    });
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 2000,
    });
    await retireTravelBase();
    await handlers['budget/copy-previous-month']({ month: '2026-01' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(8000);
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(2000);
  });

  it('BK2 copies a single slot and until year end', async () => {
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 5000,
    });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 5000,
    });
    await actions.setBudget({
      category: 'travel',
      month: '2026-02',
      amount: 2000,
    });
    await retireTravelBase();
    await refresh();
    await handlers['budget/copy-single-month']({
      month: '2026-02',
      category: 'food',
    });
    expect(zeroBudget('food', '2026-02')?.amount).toBe(8000);
    await handlers['budget/copy-until-year-end']({
      month: '2026-01',
      category: 'food',
    });
    expect(zeroBudget('food', '2026-02')?.amount).toBe(8000);
    expect(zeroBudget('food', '2026-03')?.amount).toBe(10000);
  });

  it('BK3 average', async () => {
    clock.today = '2026-01-15';
    await row('usd', '2025-10-10', -6000, null, 'food');
    // A row of the history retired below counts as Food's spending.
    await row('usd', '2025-11-10', -3000, null, 'travel');
    await row('usd', '2025-12-10', -9000, null, 'food');
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 2000,
    });
    await retireTravelBase();
    await refresh();
    await handlers['budget/set-3month-avg']({ month: '2026-01' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(4000);
    expect(zeroBudget('travel', '2026-01')?.amount).toBe(2000);
  });

  it('BK3 averages a currency slot over its displayed native spending', async () => {
    clock.today = '2026-01-15';
    await standing('JPY', '100', '2025-01-01');
    await lane('foodJpy', 'food', 'JPY.0');
    await row('jpy', '2025-11-10', -3000, -3000, 'food');
    await row('jpy', '2025-12-10', -6000, -6000, 'food');
    await refresh();
    await handlers['budget/set-n-month-avg']({
      month: '2026-01',
      N: 3,
      category: 'foodJpy',
    });
    expect(cell('foodJpy', '2026-01')?.budget_pair).toBe(
      '4500:4500~JPY.0@2026-01-15',
    );
  });

  it('writes a direct base edit as the displayed amount', async () => {
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 5000,
    });
    await retireTravelBase();
    await handlers['budget/budget-amount']({
      category: 'food',
      month: '2026-01',
      amount: 10000,
    });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(5000);
  });
});

describe('carry edits', () => {
  it('sets carryover on a currency slot and its inherited lanes from a month', async () => {
    await standing('IQD', '1', '2025-12-01');
    await income('iqd3', '2026-01-05', 100000, 1000000);
    await lane('travelIqd', 'travel', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('travelIqd', '2026-01', 500, 50, '2026-01-31', 'IQD.3');
    await retireLane({ lane: 'travelIqd', owner: 'foodIqd' });
    await refresh();
    await handlers['budget/set-carryover']({
      startMonth: '2026-02',
      category: 'foodIqd',
      flag: true,
    });
    expect(cell('foodIqd', '2026-01')).toBeNull();
    expect(cell('travelIqd', '2026-01')?.carryover).not.toBe(1);
    for (const month of ['2026-02', '2026-06']) {
      expect(cell('foodIqd', month)).toMatchObject({
        carryover: 1,
        budget_pair: null,
      });
      expect(cell('travelIqd', month)?.carryover).toBe(1);
    }
    // A flag-only cell assigns nothing.
    await refresh();
    expect(currency('2026-02', 'IQD').reserved).toBe(500);
  });

  it('sets carryover on a base slot and its inherited category lanes', async () => {
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 5000,
    });
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
    await refresh();
    await handlers['budget/set-carryover']({
      startMonth: '2026-01',
      category: 'food',
      flag: true,
    });
    expect(zeroBudget('food', '2026-01')?.carryover).toBe(1);
    expect(zeroBudget('travel', '2026-01')).toMatchObject({
      amount: 5000,
      carryover: 1,
    });
  });
});

describe('covering and moving (CV1 to CV4)', () => {
  // Income +10000 JPY / +100.00 on 2026-01-05; standing 100 from 2026-01-01.
  async function cvSetup({ rates = true } = {}) {
    clock.today = '2026-02-15';
    if (rates) await standing('JPY', '100', '2026-01-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
  }

  it('CV1 cover a pocket from a base slot', async () => {
    await cvSetup();
    await standing('JPY', '80', '2026-01-20');
    await row('jpy', '2026-01-10', -3000, -3000, 'travel');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 5000,
    });
    await refresh();
    const before = toBudget('2026-01');

    clock.today = '2026-01-15';
    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'food',
        to: 'travelJpy',
        amount: 3000,
      }),
    ).toEqual({ status: 'ok' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(2000);
    expect(cell('travelJpy', '2026-01')?.budget_pair).toBe(
      '3000:3000~JPY.0@2026-01-15',
    );

    clock.today = '2026-02-15';
    await refresh();
    expect(currency('2026-01', 'JPY').lanes[0].balance).toBe(0);
    expect(toBudget('2026-01') - before).toBe(-750);
  });

  it('CV2 same-currency move changes only later resets', async () => {
    await cvSetup();
    await lane('foodJpy', 'food', 'JPY.0');
    await row('jpy', '2026-01-10', -3000, -3000, 'travel');
    await assign('foodJpy', '2026-01', 10000, 10000, '2026-01-10', 'JPY.0');
    await refresh();
    const january = toBudget('2026-01');
    const february = toBudget('2026-02');
    expect(february).toBe(-3000);

    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'foodJpy',
        to: 'travelJpy',
        amount: { amount: 2000, encoding: 'JPY.0' },
      }),
    ).toEqual({ status: 'ok' });
    expect(cell('foodJpy', '2026-01')?.budget_pair).toBe(
      '8000:8000~JPY.0@2026-01-31',
    );
    expect(cell('travelJpy', '2026-01')?.budget_pair).toBe(
      '2000:2000~JPY.0@2026-01-31',
    );
    await refresh();
    expect(toBudget('2026-01')).toBe(january);
    expect(toBudget('2026-02') - february).toBe(2000);
    expect(toBudget('2026-02')).toBe(-1000);
  });

  it('CV3 release to To Budget', async () => {
    await cvSetup();
    await standing('JPY', '80', '2026-01-20');
    await assign('travelJpy', '2026-01', 10000, 10000, '2026-01-10', 'JPY.0');
    await refresh();
    expect(toBudget('2026-01')).toBe(0);

    clock.today = '2026-01-15';
    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'travelJpy',
        to: 'to-budget',
        amount: { amount: 2000, encoding: 'JPY.0' },
      }),
    ).toEqual({ status: 'ok' });
    expect(cell('travelJpy', '2026-01')?.budget_pair).toBe(
      '8000:8000~JPY.0@2026-01-15',
    );

    clock.today = '2026-02-15';
    await refresh();
    expect(toBudget('2026-01')).toBe(2500);
  });

  it('CV4 manual completion writes nothing without a rate', async () => {
    await cvSetup({ rates: false });
    await row('jpy', '2026-01-10', -3000, -3000, 'travel');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 5000,
    });
    await refresh();
    const messages = count('messages_crdt');

    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'food',
        to: 'travelJpy',
        amount: 3000,
      }),
    ).toEqual({
      status: 'rate-unavailable',
      needs: ['destinationAmount', 'rate'],
    });
    expect(count('messages_crdt')).toBe(messages);
    expect(zeroBudget('food', '2026-01')?.amount).toBe(5000);
    expect(cell('travelJpy', '2026-01')).toBeNull();

    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'food',
        to: 'travelJpy',
        amount: 3000,
        destinationAmount: { amount: 3000, encoding: 'JPY.0' },
      }),
    ).toEqual({ status: 'ok' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(2000);
    expect(cell('travelJpy', '2026-01')).toMatchObject({
      amount: 3000,
      base_amount: 3000,
    });
  });

  it('CV4 completes with a supplied rate', async () => {
    await cvSetup({ rates: false });
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 5000,
    });
    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'food',
        to: 'travelJpy',
        amount: 3000,
        rate: '100',
      }),
    ).toEqual({ status: 'ok' });
    expect(cell('travelJpy', '2026-01')).toMatchObject({
      amount: 3000,
      base_amount: 3000,
    });
  });
});

describe('templates (TP1)', () => {
  async function foodTemplate() {
    // Templates budget from available funds.
    await income('usd', '2026-01-05', 10000, null);
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'food',
          templates: [
            {
              type: 'simple',
              monthly: 50,
              directive: 'template',
              priority: 1,
            },
          ],
        },
      ],
      source: 'ui',
    });
  }

  it('TP1 applies to the base slot after conversion', async () => {
    await createPocket({ category: 'food', currency: 'JPY' });
    await foodTemplate();
    await refresh();
    await applySingleCategoryTemplate({ month: '2026-01', category: 'food' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(5000);
    expect(count('pocket_budgets')).toBe(0);
  });

  it('TP1 applies to the current base lane after cutover', async () => {
    await createPocket({ category: 'food', currency: 'JPY' });
    await foodTemplate();
    const base = await createBaseLane('food');
    await retireLane({ lane: 'food', owner: 'shop' });
    await refresh();
    await applySingleCategoryTemplate({ month: '2026-01', category: 'food' });
    // The retired history gains no amount (a goal row may be written).
    expect(zeroBudget('food', '2026-01')?.amount ?? 0).toBe(0);
    expect(cell(base, '2026-01')?.budget_pair).toBe('5000:5000~@2026-01-31');

    // api/budget-set-amount writes the same current base slot.
    await api['api/budget-set-amount']({
      month: '2026-02',
      categoryId: 'food',
      amount: 1200,
    });
    expect(zeroBudget('food', '2026-02')).toBeNull();
    expect(cell(base, '2026-02')?.budget_pair).toBe('1200:1200~@2026-02-28');
  });
});

describe('finalize pending', () => {
  it('finalizes named pending cells with an entered base', async () => {
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, null, '2026-01-10', 'JPY.0');
    // Budget months exist from the first activity.
    await income('usd', '2026-01-05', 10000, null);
    await refresh();
    expect(
      await handlers['budget/pockets-finalize']({
        cells: [{ month: '2026-01', laneId: 'travelJpy' }],
      }),
    ).toEqual({
      finalized: [],
      pending: [{ id: '202601-travelJpy', reason: 'rate-unavailable' }],
    });
    expect(
      await api['api/pockets-finalize']({
        cells: [{ month: '2026-01', laneId: 'travelJpy', baseAmount: 10000 }],
      }),
    ).toEqual({ finalized: ['202601-travelJpy'], pending: [] });
    expect(cell('travelJpy', '2026-01')?.budget_pair).toBe(
      '10000:10000~JPY.0@2026-01-10',
    );
  });
});

describe('MC-10.5 inspection 1', () => {
  /** Food's base child cut over: its own lane retired into Shop's base slot. */
  async function cutOverFood() {
    const base = await createBaseLane('food');
    await retireLane({ lane: 'food', owner: 'shop' });
    return base;
  }

  async function foodTemplates(templates: Template[]) {
    await storeTemplates({
      categoriesWithTemplates: [{ id: 'food', templates }],
      source: 'ui',
    });
  }

  // F2: template inputs read the current base slot, not the retired cells
  // keyed by the category id.
  it('F2 copies the current base history after a cutover', async () => {
    await income('usd', '2025-12-05', 10000, null);
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'food',
      month: '2025-12',
      amount: 2500,
    });
    const base = await cutOverFood();
    await actions.setBudget({
      category: 'food',
      month: '2025-12',
      amount: 1000,
    });
    expect(cell(base, '2025-12')?.budget_pair).toBe('1000:1000~@2025-12-31');
    expect(zeroBudget('food', '2025-12')?.amount).toBe(2500);
    await foodTemplates([
      { type: 'copy', lookBack: 1, directive: 'template', priority: 1 },
    ]);
    await refresh();
    await applySingleCategoryTemplate({ month: '2026-01', category: 'food' });
    expect(cell(base, '2026-01')?.budget_pair).toBe('1000:1000~@2026-01-31');
  });

  it('F2 treats a slot without its own budget as unbudgeted', async () => {
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 2500,
    });
    const base = await cutOverFood();
    await foodTemplates([
      { type: 'simple', monthly: 50, directive: 'template', priority: 1 },
    ]);
    await refresh();
    // Not forced: only unbudgeted slots run.
    await handlers['budget/apply-goal-template']({ month: '2026-01' });
    expect(cell(base, '2026-01')?.budget_pair).toBe('5000:5000~@2026-01-31');
  });

  it('F2 refills from the current base balance', async () => {
    await income('usd', '2025-12-05', 10000, null);
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'food',
      month: '2025-12',
      amount: 2500,
    });
    const base = await cutOverFood();
    await actions.setBudget({
      category: 'food',
      month: '2025-12',
      amount: 1000,
    });
    await foodTemplates([
      {
        type: 'limit',
        amount: 50,
        hold: false,
        period: 'monthly',
        directive: 'template',
        priority: null,
      },
      { type: 'refill', directive: 'template', priority: 1 },
    ]);
    await refresh();
    await applySingleCategoryTemplate({ month: '2026-01', category: 'food' });
    // 50.00 limit less last month's 10.00 balance of the current base slot.
    expect(cell(base, '2026-01')?.budget_pair).toBe('4000:4000~@2026-01-31');
  });

  it('F2 reads every category-keyed cell of a cut-over category from its slot', async () => {
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 2500,
    });
    await actions.setCategoryCarryover({
      startMonth: '2026-01',
      category: 'food',
      flag: true,
    });
    await cutOverFood();
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 1000,
    });
    await row('usd', '2026-01-10', -300, null, 'food');
    await refresh();
    const sheetName = monthUtils.sheetForMonth('2026-01');
    // Cleanup and template inputs all come through these readers.
    expect(await actions.getSheetValue(sheetName, 'budget-food')).toBe(1000);
    expect(await actions.getSheetValue(sheetName, 'sum-amount-food')).toBe(
      -300,
    );
    expect(await actions.getSheetValue(sheetName, 'leftover-food')).toBe(700);
    expect(await actions.getSheetBoolean(sheetName, 'carryover-food')).toBe(
      false,
    );
    // Shop's base slot inherits Food's retired lane.
    expect(await actions.getSheetValue(sheetName, 'budget-shop')).toBe(2500);
    expect(await actions.getSheetBoolean(sheetName, 'carryover-shop')).toBe(
      false,
    );
  });

  // F3: an explicit rate comes before saved rates, quote per budget unit.
  it('F3 converts at an explicit rate over a saved one', async () => {
    clock.today = '2026-02-15';
    await standing('JPY', '80', '2026-01-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 5000,
    });
    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'food',
        to: 'travelJpy',
        amount: 3000,
        rate: '100',
      }),
    ).toEqual({ status: 'ok' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(2000);
    expect(cell('travelJpy', '2026-01')).toMatchObject({
      amount: 3000,
      base_amount: 3000,
    });
  });

  it('F3 converts a released native amount at the explicit rate', async () => {
    clock.today = '2026-02-15';
    await standing('JPY', '80', '2026-01-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, 12500, '2026-01-31', 'JPY.0');
    expect(
      await handlers['budget/pocket-transfer']({
        month: '2026-01',
        from: 'travelJpy',
        to: 'food',
        amount: { amount: 3000, encoding: 'JPY.0' },
        rate: '100',
      }),
    ).toEqual({ status: 'ok' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(3000);
    expect(cell('travelJpy', '2026-01')).toMatchObject({
      amount: 7000,
      base_amount: 7000,
    });
  });
});

describe('MC-10.5 inspection 2', () => {
  // R1: templates start from the carry-in after each lane's own reset.
  it('R1 refills from the carry-in after each lane resets', async () => {
    await income('usd', '2025-12-05', 20000, null);
    await income('usd', '2026-01-05', 20000, null);
    // Food's own lane: -100.00 in December, rollover off.
    await row('usd', '2025-12-10', -10000, null, 'food');
    // Travel's lane, +50.00, carries into Food's base slot.
    await actions.setBudget({
      category: 'travel',
      month: '2025-12',
      amount: 5000,
    });
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'food',
          templates: [
            {
              type: 'limit',
              amount: 100,
              hold: false,
              period: 'monthly',
              directive: 'template',
              priority: null,
            },
            { type: 'refill', directive: 'template', priority: 1 },
          ],
        },
      ],
      source: 'ui',
    });
    await refresh();
    const sheetName = monthUtils.sheetForMonth('2026-01');
    // Ending balances keep their meaning: -50.00 in December, and January's
    // balance before any template is the 50.00 that carried.
    expect(
      await actions.getSheetValue(
        monthUtils.sheetForMonth('2025-12'),
        'leftover-food',
      ),
    ).toBe(-5000);
    expect(await actions.getSheetValue(sheetName, 'leftover-food')).toBe(5000);

    await applySingleCategoryTemplate({ month: '2026-01', category: 'food' });
    expect(zeroBudget('food', '2026-01')?.amount).toBe(5000);
    expect(await actions.getSheetValue(sheetName, 'leftover-food')).toBe(10000);
  });

  // R2: cleanup's rollover policy is the current slot's, both paths and
  // both directions.
  async function cleanupCase({
    grouped,
    oldRollover,
  }: {
    grouped: boolean;
    oldRollover: boolean;
  }) {
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 5000,
    });
    await actions.setCategoryCarryover({
      startMonth: '2026-01',
      category: 'food',
      flag: oldRollover,
    });
    const base = await createBaseLane('food');
    await retireLane({ lane: 'food', owner: 'shop' });
    // Food's current base lane is overspent by 10.00 with the opposite flag.
    await actions.setCategoryCarryover({
      startMonth: '2026-01',
      category: 'food',
      flag: !oldRollover,
    });
    await row('usd', '2026-01-10', -1000, null, 'food');
    if (grouped) {
      await db.insert('cleanup_groups', { id: 'pool', name: 'Pool' });
    }
    const groupId = grouped ? 'pool' : null;
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'shop',
          templates: [],
          cleanup: [{ role: 'source', groupId }],
        },
        // Global funding covers every overspent category; grouped funding
        // covers the group's overspend members.
        ...(grouped
          ? [
              {
                id: 'food',
                templates: [],
                cleanup: [{ role: 'overspend' as const, groupId: 'pool' }],
              },
            ]
          : []),
      ],
      source: 'ui',
    });
    await refresh();
    const sheetName = monthUtils.sheetForMonth('2026-01');
    expect(await actions.getSheetValue(sheetName, 'leftover-food')).toBe(-1000);
    expect(await actions.getSheetBoolean(sheetName, 'carryover-food')).toBe(
      !oldRollover,
    );
    await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
    return base;
  }

  for (const grouped of [false, true]) {
    const path = grouped ? 'grouped' : 'global';
    it(`R2 ${path} cleanup covers the current lane when only the old one rolled over`, async () => {
      const base = await cleanupCase({ grouped, oldRollover: true });
      expect(cell(base, '2026-01')?.amount).toBe(1000);
    });

    it(`R2 ${path} cleanup leaves the current lane rolling over when the old one did not`, async () => {
      const base = await cleanupCase({ grouped, oldRollover: false });
      // Only the rollover flag is stored: nothing is assigned.
      expect(cell(base, '2026-01')).toMatchObject({
        budget_pair: null,
        carryover: 1,
      });
    });
  }

  // R3: income categories keep the income aggregation.
  it('R3 a category changed to income keeps its income for percentage templates', async () => {
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
    await db.update('categories', {
      id: 'food',
      is_income: 1,
      cat_group: 'incomeGroup',
    });
    await row('usd', '2026-01-05', 10000, null, 'food');
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'shop',
          templates: [
            {
              type: 'percentage',
              percent: 10,
              previous: false,
              category: 'food',
              directive: 'template',
              priority: 1,
            },
          ],
        },
      ],
      source: 'ui',
    });
    await refresh();
    const sheetName = monthUtils.sheetForMonth('2026-01');
    expect(sheet.getCellValue(sheetName, 'sum-amount-food')).toBe(10000);
    expect(await actions.getSheetValue(sheetName, 'sum-amount-food')).toBe(
      10000,
    );
    await applySingleCategoryTemplate({ month: '2026-01', category: 'shop' });
    expect(zeroBudget('shop', '2026-01')?.amount).toBe(1000);
  });
});

describe('MC-10.5 inspection 3', () => {
  /**
   * Travel's January base expense of 10.00 (rollover off) is retired into
   * Food's base slot, which displays -10.00; Food's own lane is empty.
   */
  async function inheritedDeficit() {
    await income('usd', '2026-01-05', 10000, null);
    await row('usd', '2026-01-10', -1000, null, 'travel');
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
  }

  async function cleanupRoles({ grouped }: { grouped: boolean }) {
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 5000,
    });
    if (grouped) {
      await db.insert('cleanup_groups', { id: 'pool', name: 'Pool' });
    }
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'shop',
          templates: [],
          cleanup: [{ role: 'source', groupId: grouped ? 'pool' : null }],
        },
        ...(grouped
          ? [
              {
                id: 'food',
                templates: [],
                cleanup: [{ role: 'overspend' as const, groupId: 'pool' }],
              },
            ]
          : []),
      ],
      source: 'ui',
    });
  }

  const sheetName = monthUtils.sheetForMonth('2026-01');
  const foodBalance = () => actions.getSheetValue(sheetName, 'leftover-food');

  // N1: a cover already in the slot is not funded again.
  it('N1 repeated cleanup funds an inherited deficit once', async () => {
    await inheritedDeficit();
    await cleanupRoles({ grouped: false });
    await refresh();
    expect(await foodBalance()).toBe(-1000);

    await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
    await sheet.waitOnSpreadsheet();
    expect(zeroBudget('food', '2026-01')?.amount).toBe(1000);
    expect(await foodBalance()).toBe(0);

    await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
    await sheet.waitOnSpreadsheet();
    expect(zeroBudget('food', '2026-01')?.amount).toBe(1000);
    expect(await foodBalance()).toBe(0);
    // The inherited history is untouched.
    expect(zeroBudget('travel', '2026-01')?.amount ?? 0).toBe(0);
  });

  it('N1 grouped then global cleanup in one run funds it once', async () => {
    await inheritedDeficit();
    await cleanupRoles({ grouped: true });
    await refresh();
    await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
    await sheet.waitOnSpreadsheet();
    expect(zeroBudget('food', '2026-01')?.amount).toBe(1000);
    expect(await foodBalance()).toBe(0);
  });

  // N2: tracking budgets keep the category rule.
  it('N2 tracking cleanup leaves a positive tracking balance unchanged', async () => {
    await inheritedDeficit();
    await refresh();
    await db.update('preferences', { id: 'budgetType', value: 'tracking' });
    await setType('tracking');
    await sheet.waitOnSpreadsheet();
    expect(actions.isTrackingBudget()).toBe(true);
    expect(sheet.get().meta().budgetType).toBe('tracking');
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 3000,
    });
    await cleanupRoles({ grouped: true });
    await sheet.waitOnSpreadsheet();
    expect(await foodBalance()).toBe(2000);

    await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
    await sheet.waitOnSpreadsheet();
    expect(
      db.firstSync<{ amount: number }>(
        'SELECT amount FROM reflect_budgets WHERE id = ?',
        ['202601-food'],
      )?.amount,
    ).toBe(3000);
    expect(await foodBalance()).toBe(2000);
  });
});

describe('MC-10.5 inspection 4', () => {
  /**
   * Food's own lane: -20.00 in January with rollover on. Travel's -10.00
   * with rollover off is retired into Food's base slot: -30.00 displayed.
   */
  async function mixedCarry() {
    await income('usd', '2026-01-05', 10000, null);
    await row('usd', '2026-01-10', -2000, null, 'food');
    await row('usd', '2026-01-11', -1000, null, 'travel');
    await actions.setCategoryCarryover({
      startMonth: '2026-01',
      category: 'food',
      flag: true,
    });
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
  }

  const sheetName = monthUtils.sheetForMonth('2026-01');
  const foodBalance = () => actions.getSheetValue(sheetName, 'leftover-food');

  async function expectFundedOnce() {
    expect(zeroBudget('food', '2026-01')).toMatchObject({
      amount: 1000,
      carryover: 1,
    });
    expect(await foodBalance()).toBe(-2000);
    expect(await actions.getSheetBoolean(sheetName, 'carryover-food')).toBe(
      true,
    );
    // The inherited lane is never written.
    expect(zeroBudget('travel', '2026-01')?.amount ?? 0).toBe(0);
  }

  it('N1 repeated cleanup funds only the resetting deficit, once', async () => {
    await mixedCarry();
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 5000,
    });
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'shop',
          templates: [],
          cleanup: [{ role: 'source', groupId: null }],
        },
      ],
      source: 'ui',
    });
    await refresh();
    expect(await foodBalance()).toBe(-3000);
    for (let run = 0; run < 3; run++) {
      await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
      await sheet.waitOnSpreadsheet();
      await expectFundedOnce();
    }
  });

  it('N1 grouped then global cleanup funds only the resetting deficit', async () => {
    await mixedCarry();
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 5000,
    });
    await db.insert('cleanup_groups', { id: 'pool', name: 'Pool' });
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'shop',
          templates: [],
          cleanup: [{ role: 'source', groupId: 'pool' }],
        },
        {
          id: 'food',
          templates: [],
          cleanup: [{ role: 'overspend', groupId: 'pool' }],
        },
      ],
      source: 'ui',
    });
    await refresh();
    await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
    await sheet.waitOnSpreadsheet();
    await expectFundedOnce();
  });
});

describe('MC-10.5 inspection 5 (cleanup ruling)', () => {
  // Divergent slots: Travel's January expense of 10.00 (rollover off) is
  // retired into Food's base slot, so D = 10.00. Cleanup funds
  // max(0, A_min - A) on Food's own lane, with A_min = D - C, less S too
  // when the own lane does not roll over.
  const cases: Array<{
    name: string;
    own?: () => Promise<void>;
    assigned: number;
    display: number;
  }> = [
    {
      name: 'mixed carry (S -20.00 rolling over) funds 10.00',
      own: async () => {
        await row('usd', '2026-01-10', -2000, null, 'food');
        await actions.setCategoryCarryover({
          startMonth: '2026-01',
          category: 'food',
          flag: true,
        });
      },
      assigned: 1000,
      display: -2000,
    },
    {
      name: 'an empty own lane funds 10.00',
      assigned: 1000,
      display: 0,
    },
    {
      name: 'a carried surplus (C 10.00) funds nothing',
      own: async () => {
        await actions.setBudget({
          category: 'food',
          month: '2025-12',
          amount: 1000,
        });
      },
      assigned: 0,
      display: 0,
    },
    {
      name: 'a -5.00 start rolling over funds 15.00',
      own: async () => {
        await actions.setBudget({
          category: 'food',
          month: '2026-01',
          amount: -500,
        });
        await actions.setCategoryCarryover({
          startMonth: '2026-01',
          category: 'food',
          flag: true,
        });
      },
      assigned: 1000,
      display: 0,
    },
    {
      name: 'a +5.00 start funds 5.00',
      own: async () => {
        await actions.setBudget({
          category: 'food',
          month: '2026-01',
          amount: 500,
        });
      },
      assigned: 1000,
      display: 0,
    },
  ];

  const sheetName = monthUtils.sheetForMonth('2026-01');

  async function setupCase(
    own: (() => Promise<void>) | undefined,
    grouped: boolean,
  ) {
    await income('usd', '2025-12-05', 10000, null);
    await income('usd', '2026-01-05', 10000, null);
    await own?.();
    await row('usd', '2026-01-11', -1000, null, 'travel');
    await createBaseLane('travel');
    await retireLane({ lane: 'travel', owner: 'food' });
    await actions.setBudget({
      category: 'shop',
      month: '2026-01',
      amount: 5000,
    });
    if (grouped) {
      await db.insert('cleanup_groups', { id: 'pool', name: 'Pool' });
    }
    await storeTemplates({
      categoriesWithTemplates: [
        {
          id: 'shop',
          templates: [],
          cleanup: [{ role: 'source', groupId: grouped ? 'pool' : null }],
        },
        ...(grouped
          ? [
              {
                id: 'food',
                templates: [],
                cleanup: [{ role: 'overspend' as const, groupId: 'pool' }],
              },
            ]
          : []),
      ],
      source: 'ui',
    });
    await refresh();
  }

  async function cleanupTwice(assigned: number, display: number) {
    for (let run = 0; run < 2; run++) {
      await handlers['budget/cleanup-goal-template']({ month: '2026-01' });
      await sheet.waitOnSpreadsheet();
      expect(zeroBudget('food', '2026-01')?.amount ?? 0).toBe(assigned);
      expect(await actions.getSheetValue(sheetName, 'leftover-food')).toBe(
        display,
      );
      // Inherited lanes are never written.
      expect(zeroBudget('travel', '2026-01')?.amount ?? 0).toBe(0);
    }
  }

  for (const { name, own, assigned, display } of cases) {
    it(`${name}, once across runs`, async () => {
      await setupCase(own, false);
      await cleanupTwice(assigned, display);
      expect(zeroBudget('food', '2026-01')?.amount ?? 0).toBe(assigned);
    });

    it(`${name}, once across grouped and global passes`, async () => {
      await setupCase(own, true);
      await cleanupTwice(assigned, display);
      expect(zeroBudget('food', '2026-01')?.amount ?? 0).toBe(assigned);
    });
  }
});
