import { Timestamp } from '@actual-app/crdt';

import { installAPI } from '#server/api';
import type { APICategoryPockets } from '#server/api-models';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import { getFxImpact } from '#server/reports/fx-impact';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import { clearUndo, undo, withUndo } from '#server/undo';
import type { Money } from '#shared/money';
import * as monthUtils from '#shared/months';
import type { ServerHandlers } from '#types/server-handlers';

import * as actions from './actions';
import { app as budgetApp } from './app';
import { createAllBudgets } from './base';
import { refreshFxChanges, stopFxDayWatch } from './fx-valuation';
import { writePocketBudgetCell } from './pockets';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

// MC-10.3 readers: MC-8.2 details, the MC-9 bridge, envelope-budget-month
// and api/budget-month. Fixtures state their own today; every other month
// is past.
const clock = {
  set today(day: string) {
    global.currentDay = day;
    global.currentMonth = day.slice(0, 7);
  },
};

const m = 2251799813685247; // MAX_SAFE_NUMBER

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
  encoding = 'JPY.0',
) {
  expect(
    await writePocketBudgetCell({
      lane: laneId,
      month,
      pair: { native, base, encoding, captureDate },
    }),
  ).toEqual({ status: 'ok' });
}

/** A first assignment through the undoable path, then the real undo. */
async function undoneFirstWrite(laneId: string, month: string) {
  await runMutator(() =>
    withUndo(() =>
      writePocketBudgetCell({
        lane: laneId,
        month,
        pair: {
          native: 100,
          base: 100,
          encoding: 'JPY.0',
          captureDate: monthUtils.getMonthEnd(`${month}-01`),
        },
      }),
    ),
  );
  await undo();
}

let rowId = 0;
async function row(
  account: string,
  date: string,
  base: number,
  native: number | null,
  category: string | null,
) {
  await db.insertTransaction({
    id: `row${rowId++}`,
    account,
    date,
    amount: base,
    ...(native !== null && { transaction_amount: native }),
    category,
  });
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

/** The affected category's entry in `envelope-budget-month`. */
async function budgetMonthEntry(month: string, category: string) {
  const cells = await budgetApp.handlers['envelope-budget-month']({ month });
  const value = cells.find(
    cell =>
      cell.name ===
      `${monthUtils.sheetForMonth(month)}!category-pockets-${category}`,
  )?.value;
  return typeof value === 'object' ? value : undefined;
}

const api = installAPI({} as unknown as ServerHandlers);

async function apiCategory(month: string, id: string, money = false) {
  const result = await api['api/budget-month']({
    month,
    ...(money && { options: { amountFormat: 'money' as const } }),
  });
  // The wire type keeps categories open; affected ones add pocket fields.
  return result.categoryGroups
    .flatMap(group => group.categories ?? [])
    .find(category => category.id === id) as
    | (Record<string, unknown> & Partial<APICategoryPockets<number | Money>>)
    | undefined;
}

async function details(month: string) {
  return budgetApp.handlers['budget/fx-valuation']({ month });
}

function jpyOf<T extends { currency: string }>(
  shown: { currencies: T[] } | null | undefined,
) {
  return shown?.currencies.find(c => c.currency === 'JPY');
}

async function bridge(month: string) {
  const result = await getFxImpact({
    startMonth: month,
    endMonth: month,
    accountIds: null,
    currencies: null,
  });
  return result.months[0].bridge;
}

beforeEach(async () => {
  setSyncingMode('offline');
  clock.today = '2026-06-15';
  rowId = 0;
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
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'jpy2', name: 'Yen 2', currency: 'JPY' },
    { id: 'eur', name: 'Euro', currency: 'EUR' },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
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
  api['get-budget-bounds'] = vi
    .fn()
    .mockResolvedValue({ start: '2025-01', end: '2027-12' });
});

afterEach(() => {
  stopFxDayWatch();
  setSyncingMode('disabled');
  global.currentDay = null;
  global.currentMonth = null;
});

describe('display arithmetic and explanations (R9)', () => {
  /** AN1: 10000 JPY held and reserved, valued from 2026-01-20 at 80. */
  async function an1() {
    await standing('JPY', '80', '2026-01-20');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, 10000, '2026-01-31');
  }

  it('AN1 envelope-budget-month and api/budget-month value the balance', async () => {
    await an1();
    await refresh();
    expect(value('2026-01', 'to-budget')).toBe(0);

    const entry = await budgetMonthEntry('2026-01', 'travel');
    expect(entry).toMatchObject({
      budgeted: 10000,
      spent: 0,
      fxContribution: 2500,
      balance: 12500,
      carryIn: 0,
      reset: 0,
      base: { budgeted: 0, spent: 0, balance: 0, carryover: false },
      incomplete: [],
    });
    expect(entry).toMatchObject({
      pockets: [
        {
          id: 'travelJpy',
          currency: 'JPY',
          precision: 0,
          hidden: false,
          budgeted: 10000,
          budgetedBase: 10000,
          spent: 0,
          spentBase: 0,
          balance: 10000,
          balanceBase: 12500,
          fxContribution: 2500,
          carryIn: 0,
          reset: 0,
          valuationDate: '2026-01-31',
          valuation: 'market',
          rate: { rate: '80', kind: 'standing' },
          incomplete: [],
          lanes: [
            {
              laneId: 'travelJpy',
              kind: 'own',
              originCategoryId: 'travel',
              encoding: 'JPY.0',
              budgeted: 10000,
              budgetedBase: 10000,
              captureDate: '2026-01-31',
              spent: 0,
              spentBase: 0,
              balance: 10000,
              balanceBase: 12500,
              valueKind: 'resolved',
              carryover: false,
              status: 'live',
            },
          ],
        },
      ],
    });
    // An ordinary category has no pocket entry.
    expect(await budgetMonthEntry('2026-01', 'food')).toBeUndefined();
    // February carries the valued balance in.
    expect(await budgetMonthEntry('2026-02', 'travel')).toMatchObject({
      budgeted: 0,
      carryIn: 12500,
      reset: 0,
      fxContribution: 0,
      balance: 12500,
    });

    const raw = await apiCategory('2026-01', 'travel');
    expect(raw).toMatchObject({
      budgeted: 10000,
      spent: 0,
      balance: 12500,
      carryIn: 0,
      reset: 0,
      fxContribution: 2500,
      base: { budgeted: 0, spent: 0, balance: 0 },
      pockets: [{ id: 'travelJpy', budgeted: 10000, balanceBase: 12500 }],
    });
    const money = await apiCategory('2026-01', 'travel', true);
    expect(money).toMatchObject({
      budgeted: { amount: 10000, currencyCode: 'USD' },
      balance: { amount: 12500, currencyCode: 'USD' },
      fxContribution: { amount: 2500, currencyCode: 'USD' },
      pockets: [
        {
          budgeted: { amount: 10000, currencyCode: 'JPY' },
          budgetedBase: { amount: 10000, currencyCode: 'USD' },
          balance: { amount: 10000, currencyCode: 'JPY' },
          balanceBase: { amount: 12500, currencyCode: 'USD' },
          lanes: [
            {
              budgeted: { amount: 10000, currencyCode: 'JPY' },
              balanceBase: { amount: 12500, currencyCode: 'USD' },
            },
          ],
        },
      ],
    });
    // Ordinary categories keep their sheet amounts.
    expect(await apiCategory('2026-01', 'food')).not.toHaveProperty('pockets');
  });

  it('AN2 carry-in and reset are shown separately', async () => {
    await standing('JPY', '100', '2025-12-01');
    await actions.setBudget({
      category: 'travel',
      month: '2026-01',
      amount: 5000,
    });
    await lane('travelJpy', 'travel', 'JPY.0');
    await row('jpy', '2026-01-10', -3000, -3000, 'travel');
    await refresh();
    expect(await budgetMonthEntry('2026-01', 'travel')).toMatchObject({
      budgeted: 5000,
      spent: -3000,
      balance: 2000,
      fxContribution: 0,
      pockets: [{ spent: -3000, spentBase: -3000, balanceBase: -3000 }],
    });
    expect(await budgetMonthEntry('2026-02', 'travel')).toMatchObject({
      carryIn: 5000,
      reset: -3000,
      balance: 5000,
      base: { carryIn: 5000, reset: 0, balance: 5000 },
      pockets: [{ carryIn: 0, reset: -3000, balance: 0, balanceBase: 0 }],
    });
    expect(await apiCategory('2026-02', 'travel')).toMatchObject({
      carryIn: 5000,
      reset: -3000,
      balance: 5000,
    });
  });

  it('BR1 MC-8.2 details and the MC-9 bridge explain the reservation', async () => {
    await an1();
    await refresh();
    // A cell the next refresh has not written yet leaves the bridge pending.
    sheet.get().set('budget202601!reservation-changes', 0);
    await sheet.waitOnSpreadsheet();
    expect((await bridge('2026-01'))?.reservations).toMatchObject({
      changes: 12500,
      cell: { changes: 0, incomplete: false },
      pending: true,
    });

    await refresh();
    const expected = {
      changes: 12500,
      incomplete: false,
      cell: { changes: 12500, incomplete: false },
      pending: false,
      assigned: 10000,
      remainder: 2500,
      currencies: [
        {
          currency: 'JPY',
          valuation: 'market',
          pocketTotal: 12500,
          includedReservation: 12500,
          writtenChange: 12500,
          funds: 0,
          lanes: [
            { laneId: 'travelJpy', categoryId: 'travel', balanceBase: 12500 },
          ],
        },
      ],
    };
    const shown = await details('2026-01');
    expect(shown.posted).toBe(2500);
    expect(shown.reservations).toMatchObject(expected);
    expect(jpyOf(shown.reservations)).not.toHaveProperty('exact');
    expect(value('2026-01', 'to-budget')).toBe(0);
    expect((await bridge('2026-01'))?.reservations).toMatchObject(expected);
  });

  it('BR3 planning: PL1 details and the current-month bridge show Q and D', async () => {
    clock.today = '2026-01-15';
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-02', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await income('jpy', '2026-03-10', 8000, 10000);
    await assign('travelJpy', '2026-03', 10000, 10000, '2026-01-15');
    await refresh();
    expect(jpyOf((await details('2026-03')).reservations)).toMatchObject({
      planning: -2000,
      accountRounding: 0,
      funds: 8000,
    });
  });

  it('BR3 planning in the current month reaches the bridge (PL3)', async () => {
    clock.today = '2026-01-15';
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-02', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await income('jpy', '2026-01-25', 8000, 10000);
    await assign('travelJpy', '2026-01', 10000, 10000, '2026-01-15');
    await refresh();
    for (const shown of [
      (await details('2026-01')).reservations,
      (await bridge('2026-01'))?.reservations,
    ]) {
      expect(jpyOf(shown)).toMatchObject({
        planning: -2000,
        accountRounding: 0,
        funds: 8000,
      });
    }
  });

  it('BR3 RL4 February: rule 3 with null lane values', async () => {
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, null, '2026-01-10');
    await assign('travelJpy', '2026-02', -4000, null, '2026-02-28');
    await refresh();
    for (const shown of [
      (await details('2026-02')).reservations,
      (await bridge('2026-02'))?.reservations,
    ]) {
      expect(shown).toMatchObject({ assigned: null, remainder: null });
      expect(jpyOf(shown)).toMatchObject({
        rule: 3,
        valuation: 'included-rate',
        includedValue: 10000,
        pocketTotal: 6000,
        funds: 4000,
        lanes: [{ balanceBase: null, valueKind: 'unknown' }],
      });
      expect(jpyOf(shown)?.incomplete).toContain('rate-unavailable');
    }
  });

  it('BR3 OV1 January: fx-excluded with E out of range', async () => {
    await standing('JPY', '100', '2026-01-20');
    await income('jpy', '2026-01-05', 1, m);
    await income('jpy2', '2026-01-05', 1, m);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', m, null, '2026-01-10');
    await assign('laneB', '2026-01', m, null, '2026-01-10');
    await refresh();
    for (const shown of [
      (await details('2026-01')).reservations,
      (await bridge('2026-01'))?.reservations,
    ]) {
      const jpy = jpyOf(shown);
      expect(jpy).toMatchObject({
        rule: 3,
        excludedFx: null,
        pocketTotal: 2,
      });
      expect(jpy?.incomplete).toEqual(
        expect.arrayContaining(['fx-excluded', 'amount-out-of-range']),
      );
    }
  });

  it('BR3 OV2 January: gross P and exact X null, nothing included', async () => {
    await standing('JPY', '100', '2025-12-01');
    // Budget-currency income gives January its sheet.
    await income('usd', '2026-01-05', 10000, null);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', m, null, '2026-01-10');
    await assign('laneB', '2026-01', m, null, '2026-01-10');
    await refresh();
    for (const shown of [
      (await details('2026-01')).reservations,
      (await bridge('2026-01'))?.reservations,
    ]) {
      expect(shown).toMatchObject({
        incomplete: true,
        cell: { incomplete: true },
      });
      const jpy = jpyOf(shown);
      expect(jpy).toMatchObject({
        pocketTotal: null,
        exactChange: null,
        includedReservation: 0,
        writtenChange: 0,
        funds: 0,
      });
      expect(jpy?.incomplete).toEqual(
        expect.arrayContaining([
          'amount-out-of-range',
          'reservation-incomplete',
        ]),
      );
    }
  });

  it('BR3 MM1 February: unknown native is never labeled market', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 4000, 4000, '2026-01-31');
    await applyMessages([
      remote('pocket_budgets', '202602-travelJpy', 'month', 202602),
      remote('pocket_budgets', '202602-travelJpy', 'lane', 'travelJpy'),
      remote(
        'pocket_budgets',
        '202602-travelJpy',
        'budget_pair',
        '1000:1000~KWD.3@2026-02-28',
      ),
    ]);
    await refresh();
    for (const shown of [
      (await details('2026-02')).reservations,
      (await bridge('2026-02'))?.reservations,
    ]) {
      expect(jpyOf(shown)).toMatchObject({
        valuation: 'unknown-native',
        rule: null,
        pocketTotal: 4000,
        includedReservation: 4000,
        lanes: [{ balance: null, balanceBase: null, valueKind: 'unknown' }],
      });
    }
    expect(await budgetMonthEntry('2026-02', 'travel')).toMatchObject({
      balance: null,
      pockets: [{ valuation: 'unknown-native', budgeted: null, balance: null }],
    });
  });

  it('SB1 wire: an out-of-range spent base stays null with its reason', async () => {
    await standing('JPY', '100', '2025-12-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await row('jpy', '2026-01-10', -m, -1, 'travel');
    await row('jpy', '2026-01-11', -1, -1, 'travel');
    await refresh();
    const raw = await apiCategory('2026-01', 'travel');
    expect(raw).toMatchObject({
      spent: null,
      pockets: [
        {
          spent: -2,
          spentBase: null,
          lanes: [{ spent: -2, spentBase: null }],
        },
      ],
    });
    expect(raw?.incomplete).toContain('amount-out-of-range');
    expect(raw?.pockets?.[0].incomplete).toContain('amount-out-of-range');
    const money = await apiCategory('2026-01', 'travel', true);
    expect(money).toMatchObject({
      spent: null,
      pockets: [
        {
          spent: { amount: -2, currencyCode: 'JPY' },
          spentBase: null,
          lanes: [{ spentBase: null }],
        },
      ],
    });
    expect(money?.incomplete).toContain('amount-out-of-range');
  });
});

describe('inspection 1 regressions', () => {
  /** Raw integers, or Money in the given currency. */
  const amountIn = (money: boolean) => (value: number, code: string) =>
    money ? { amount: value, currencyCode: code } : value;

  it.each([
    ['JPY.2', 30000000000000],
    ['JPY.15', 10000],
  ])(
    'finding 2: an empty finer %s sibling leaves a representable slot readable',
    async (sibling, n) => {
      await standing('JPY', '100', '2025-12-01');
      await income('jpy', '2026-01-05', n, n);
      await lane('travelJpy', 'travel', 'JPY.0');
      await lane('foodFine', 'food', sibling);
      await assign('travelJpy', '2026-01', n, n, '2026-01-31');
      await refresh();
      for (const money of [false, true]) {
        const amount = amountIn(money);
        const travel = await apiCategory('2026-01', 'travel', money);
        expect(travel).toMatchObject({
          budgeted: amount(n, 'USD'),
          balance: amount(n, 'USD'),
          fxContribution: amount(0, 'USD'),
          pockets: [
            {
              precision: 0,
              budgeted: amount(n, 'JPY'),
              budgetedBase: amount(n, 'USD'),
              balance: amount(n, 'JPY'),
              balanceBase: amount(n, 'USD'),
              lanes: [
                {
                  budgeted: amount(n, 'JPY'),
                  budgetedBase: amount(n, 'USD'),
                  balance: amount(n, 'JPY'),
                },
              ],
              incomplete: [],
            },
          ],
          incomplete: [],
        });
      }
    },
  );

  it('finding 3: an unvalued carried value after rate recovery has a reason', async () => {
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, 10000, '2026-01-31');
    await assign('travelJpy', '2026-02', -4000, -4000, '2026-02-28');
    await standing('JPY', '80', '2026-03-01');
    await refresh();
    for (const money of [false, true]) {
      const travel = await apiCategory('2026-03', 'travel', money);
      expect(travel).toMatchObject({
        balance: amountIn(money)(7500, 'USD'),
        carryIn: null,
        fxContribution: null,
        pockets: [{ valuation: 'market', carryIn: null }],
      });
      expect(travel?.incomplete).toContain('reservation-unvalued');
      expect(travel?.pockets?.[0].incomplete).toContain('reservation-unvalued');
    }
  });

  it('finding 3: the first created month names its uncaptured carry', async () => {
    // No rows: the first sheet is after January (three months before June).
    await standing('JPY', '100', '2025-12-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 5000, 5000, '2026-01-31');
    await refresh();
    const first = [...sheet.get().meta().createdMonths].sort()[0];
    expect(first > '2026-01').toBe(true);
    const entry = await budgetMonthEntry(first, 'travel');
    expect(entry).toMatchObject({ balance: 5000, carryIn: null });
    expect(entry?.incomplete).toContain('reservation-unvalued');
    expect(entry?.pockets[0].incomplete).toContain('reservation-unvalued');
  });
});

describe('inspection 2 regressions', () => {
  it('R1 a representable slot total survives an unrepresentable lane', async () => {
    await standing('JPY', '100', '2025-12-01');
    // Budget-currency income gives January and February their sheets.
    await income('usd', '2026-01-05', 100, null);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'travel', 'JPY.0');
    await assign('laneA', '2026-01', m, m, '2026-01-31');
    await assign('laneB', '2026-01', -m, -m, '2026-01-31');
    await applyMessages([
      remote('pocket_budgets', '202601-laneB', 'carryover', 1),
    ]);
    await assign('laneA', '2026-02', 1, 1, '2026-02-28');
    await refresh();

    const entry = await budgetMonthEntry('2026-02', 'travel');
    expect(entry).toMatchObject({
      balance: 1,
      fxContribution: 0,
      pockets: [{ balance: 1, balanceBase: 1, fxContribution: 0 }],
    });
    const lanes = Object.fromEntries(
      (entry?.pockets[0].lanes ?? []).map(l => [l.laneId, l]),
    );
    expect(lanes.laneA).toMatchObject({ balance: null, balanceBase: null });
    expect(lanes.laneB).toMatchObject({ balance: -m, balanceBase: -m });
    expect(entry?.pockets[0].incomplete).toContain('amount-out-of-range');
    expect(await apiCategory('2026-02', 'travel')).toMatchObject({
      balance: 1,
      pockets: [{ balance: 1, balanceBase: 1 }],
    });
    expect(await apiCategory('2026-02', 'travel', true)).toMatchObject({
      balance: { amount: 1, currencyCode: 'USD' },
      pockets: [
        {
          balance: { amount: 1, currencyCode: 'JPY' },
          balanceBase: { amount: 1, currencyCode: 'USD' },
        },
      ],
    });
  });

  it('R2 an unknown-native currency hides every slot native balance, as its explanation does', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 1000, 1000);
    await lane('foodJpy', 'food', 'JPY.0');
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('foodJpy', '2026-01', 50, 50, '2026-01-31');
    await applyMessages([
      remote('pocket_budgets', '202601-travelJpy', 'month', 202601),
      remote('pocket_budgets', '202601-travelJpy', 'lane', 'travelJpy'),
      remote(
        'pocket_budgets',
        '202601-travelJpy',
        'budget_pair',
        '1000:1000~KWD.3@2026-01-31',
      ),
    ]);
    await refresh();
    const explained = jpyOf((await details('2026-01')).reservations);
    expect(explained?.valuation).toBe('unknown-native');
    const explainedFood = explained?.lanes.find(l => l.laneId === 'foodJpy');
    const food = await budgetMonthEntry('2026-01', 'food');
    expect(food?.pockets[0]).toMatchObject({
      valuation: 'unknown-native',
      balance: null,
      lanes: [{ laneId: 'foodJpy', balance: null }],
    });
    expect(food?.pockets[0].lanes[0].balance).toBe(explainedFood?.balance);
    expect(food?.pockets[0].incomplete).toContain('pair-encoding-mismatch');
    expect(food?.incomplete).toContain('pair-encoding-mismatch');
  });

  it('R3 a slot reports no overflow that none of its amounts has', async () => {
    await standing('JPY', '100', '2025-12-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', -m, -m, '2026-01-31');
    await applyMessages([
      remote('pocket_budgets', '202601-travelJpy', 'carryover', 1),
      remote('pocket_budgets', '202602-travelJpy', 'month', 202602),
      remote('pocket_budgets', '202602-travelJpy', 'lane', 'travelJpy'),
      remote(
        'pocket_budgets',
        '202602-travelJpy',
        'budget_pair',
        '1000:1000~KWD.3@2026-02-28',
      ),
    ]);
    for (const month of ['2026-02', '2026-03']) {
      await row('jpy', `${month}-10`, m, 1, 'travel');
      await row('jpy', `${month}-11`, -m, -1, 'salary');
    }
    await refresh();
    const real = jpyOf((await details('2026-03')).reservations);
    expect(real?.incomplete).not.toContain('amount-out-of-range');
    const travel = await budgetMonthEntry('2026-03', 'travel');
    expect(travel?.pockets[0].incomplete).toContain('pair-encoding-mismatch');
    expect(travel?.pockets[0].incomplete).not.toContain('amount-out-of-range');
    expect(travel?.incomplete).not.toContain('amount-out-of-range');
  });
});

describe('reader native recurrence parity', () => {
  it('matches the currency explanation month by month', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 20000, 20000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await lane('foodJpy', 'food', 'JPY.0');
    await assign('travelJpy', '2026-01', 5000, 5000, '2026-01-31');
    await row('jpy', '2026-01-12', -8000, -8000, 'travel');
    await assign('foodJpy', '2026-01', 10000, 10000, '2026-01-31');
    await applyMessages([
      remote('pocket_budgets', '202601-foodJpy', 'carryover', 1),
    ]);
    await row('jpy', '2026-02-12', -12000, -12000, 'food');
    await assign('travelJpy', '2026-03', 2000, 2000, '2026-03-31');
    // An absent authority: a first write undone (inspection 3, N1).
    clearUndo();
    await undoneFirstWrite('foodJpy', '2026-03');
    await refresh();
    for (const month of ['2026-01', '2026-02', '2026-03', '2026-04']) {
      const explained = jpyOf((await details(month)).reservations)!.lanes;
      for (const category of ['travel', 'food']) {
        const entry = await budgetMonthEntry(month, category);
        for (const lane of entry!.pockets[0].lanes) {
          const expected = explained.find(l => l.laneId === lane.laneId)!;
          expect([
            month,
            lane.laneId,
            lane.budgeted,
            lane.spent,
            lane.balance,
          ]).toEqual([
            month,
            expected.laneId,
            expected.budgeted,
            expected.spent,
            expected.balance,
          ]);
        }
      }
    }
  });
});

describe('inspection 3 regressions', () => {
  it('N1 an undone first assignment is a native zero, not an unknown', async () => {
    clearUndo();
    await lane('travelJpy', 'travel', 'JPY.0');
    await undoneFirstWrite('travelJpy', '2026-01');
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 1000, 1000);
    await refresh();
    for (const money of [false, true]) {
      const amount = (value: number, code: string) =>
        money ? { amount: value, currencyCode: code } : value;
      const travel = await apiCategory('2026-01', 'travel', money);
      expect(travel).toMatchObject({
        pockets: [
          {
            budgeted: amount(0, 'JPY'),
            balance: amount(0, 'JPY'),
            lanes: [{ budgeted: amount(0, 'JPY'), balance: amount(0, 'JPY') }],
            incomplete: [],
          },
        ],
        incomplete: [],
      });
    }
    // The following month carries what the producer carries.
    const explained = jpyOf((await details('2026-02')).reservations)!.lanes[0];
    const february = await budgetMonthEntry('2026-02', 'travel');
    expect(february?.pockets[0]).toMatchObject({ carryIn: 0, incomplete: [] });
    expect(february?.pockets[0].lanes[0]).toMatchObject({
      budgeted: explained.budgeted,
      balance: explained.balance,
    });
    expect(explained).toMatchObject({ carryIn: 0, balance: 0 });
  });
});
