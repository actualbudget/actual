import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  exchangeRateId,
  app as exchangeRatesApp,
} from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import type { Message } from '#server/sync';
import * as monthUtils from '#shared/months';

import * as actions from './actions';
import { createAllBudgets } from './base';
import {
  refreshFxChanges,
  stopFxDayWatch,
  walkFxValuation,
} from './fx-valuation';
import { createPocket, retireLane, writePocketBudgetCell } from './pockets';
import {
  finalizePocketAssignments,
  reservationDetails,
  walkReservations,
} from './reservations';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

// Fixtures state their own today; every other month is past.
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

/** A foreign lane with a known id, so allocation ties are fixed. */
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

let rowId = 0;
/** A row; `native` is omitted for the budget-currency account. */
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

async function fetched(currency: string, rate: string, timestamp: string) {
  await db.insert('exchange_rates', {
    id: exchangeRateId('USD', currency, 'provider', 'fetched', timestamp),
    base_currency: 'USD',
    quote_currency: currency,
    rate,
    kind: 'fetched',
    source: 'provider',
    timestamp,
    tombstone: 0,
  });
}

async function refresh() {
  await createAllBudgets();
  await refreshFxChanges();
  await sheet.waitOnSpreadsheet();
}

const value = (month: string, name: string) =>
  sheet.getCellValue(monthUtils.sheetForMonth(month), name);
const amount = (month: string, name: string) => Number(value(month, name));
const toBudget = (month: string) => amount(month, 'to-budget');

function currency(month: string, code: string) {
  const found = reservationDetails(month).find(c => c.currency === code);
  if (!found) throw new Error(`no ${code} reservation in ${month}`);
  return found;
}
/** A lane's value cell and its explicit status. */
const laneCell = (month: string, laneId: string) => [
  value(month, `pocket-value-${laneId}`),
  value(month, `pocket-value-status-${laneId}`),
];
const laneValues = (month: string, code: string) =>
  Object.fromEntries(
    currency(month, code).lanes.map(l => [l.laneId, l.balanceBase]),
  );

/**
 * To Budget, holds, category and base lane leftovers and the included
 * reservations equal budget-currency balances and the included value of
 * every other currency's holdings.
 */
function expectIdentity(month: string) {
  const end = monthUtils.bounds(month).end;
  const balances =
    db.firstSync<{ total: number | null }>(
      `SELECT SUM(t.amount) AS total FROM transactions t
         JOIN accounts a ON a.id = t.acct
       WHERE a.offbudget = 0 AND a.tombstone = 0 AND t.tombstone = 0
         AND t.isChild = 0 AND t.date <= ?
         AND (a.currency IS NULL OR a.currency = 'USD')`,
      [end],
    )?.total ?? 0;
  const currencies = reservationDetails(month);
  const sum = (field: 'includedReservation' | 'includedValue') =>
    currencies.reduce((total, c) => total + c.exact[field], 0n);
  expect(
    BigInt(
      toBudget(month) +
        amount(month, 'buffered-selected') +
        amount(month, 'total-leftover'),
    ) + sum('includedReservation'),
  ).toBe(BigInt(balances) + sum('includedValue'));
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
    { id: 'jpy3', name: 'Yen 3', currency: 'JPY' },
    { id: 'eur', name: 'Euro', currency: 'EUR' },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
    { id: 'iqd', name: 'Iraqi dinar', currency: 'IQD' },
    { id: 'iqd3', name: 'Iraqi dinar 3', currency: 'IQD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  // A recorded 3dp IQD account (C6), before it holds any row.
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
});

afterEach(() => {
  stopFxDayWatch();
  setSyncingMode('disabled');
  global.currentDay = null;
  global.currentMonth = null;
});

describe('signed equation (S2)', () => {
  it('E1 base only', async () => {
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 4000,
    });
    await refresh();
    expect(value('2026-01', 'total-budgeted')).toBe(-4000);
    expect(value('2026-01', 'reservation-changes')).toBe(0);
    expect(toBudget('2026-01')).toBe(6000);
    expectIdentity('2026-01');
  });

  it('E2 negative budget', async () => {
    await income('usd', '2026-01-05', 10000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: -1000,
    });
    await refresh();
    expect(toBudget('2026-01')).toBe(11000);
    expect(value('2026-01', 'leftover-food')).toBe(-1000);
    expectIdentity('2026-01');
  });

  it('E3 hold', async () => {
    await income('usd', '2026-01-05', 10000, null);
    await refresh();
    await actions.holdForNextMonth({ month: '2026-01', amount: 4000 });
    await refresh();
    expect(toBudget('2026-01')).toBe(6000);
    expectIdentity('2026-01');
    expect(value('2026-02', 'from-last-month')).toBe(10000);
  });

  it('E4 mixed', async () => {
    await standing('JPY', '100', '2025-12-01');
    await standing('JPY', '80', '2026-01-20');
    await income('jpy', '2026-01-05', 10000, 10000);
    await income('usd', '2026-01-05', 5000, null);
    await actions.setBudget({
      category: 'food',
      month: '2026-01',
      amount: 2000,
    });
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 4000, 4000, '2026-01-31');
    await refresh();
    const jpy = currency('2026-01', 'JPY');
    expect(jpy.marketHoldings).toBe(12500);
    expect(jpy.marketUnreserved).toBe(7500);
    expect(jpy.pocketTotal).toBe(5000);
    expect(value('2026-01', 'reservation-changes')).toBe(5000);
    expect(value('2026-01', 'fx-changes')).toBe(2500);
    expect(toBudget('2026-01')).toBe(10500);
    expectIdentity('2026-01');
  });
});

describe('reservations and rounding (S1)', () => {
  beforeEach(async () => {
    await standing('JPY', '3', '2025-12-01');
  });

  it('Z1 no lanes', async () => {
    await income('jpy', '2026-01-05', 33, 1);
    await income('jpy2', '2026-01-05', 33, 1);
    await refresh();
    const jpy = currency('2026-01', 'JPY');
    expect(jpy).toMatchObject({
      holdingsValue: 66,
      marketHoldings: 67,
      accountRounding: -1,
      reserved: 0,
      pocketTotal: 0,
      valuation: 'market',
    });
    expect(toBudget('2026-01')).toBe(66);
    expect(value('2026-01', 'fx-changes')).toBe(0);
    expectIdentity('2026-01');
  });

  it('Z2 empty lane, created and deleted', async () => {
    await income('jpy', '2026-01-05', 33, 1);
    await income('jpy2', '2026-01-05', 33, 1);
    const { id } = await createPocket({ category: 'travel', currency: 'JPY' });
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      reserved: 0,
      pocketTotal: 0,
    });
    expect(toBudget('2026-01')).toBe(66);
    await db.update('category_pockets', { id, tombstone: 1 });
    await refresh();
    expect(toBudget('2026-01')).toBe(66);
    expectIdentity('2026-01');
  });

  it('Z3 deletion into a new destination', async () => {
    for (const account of ['jpy', 'jpy2', 'jpy3']) {
      await income(account, '2026-01-05', 33, 1);
    }
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 1, 33, '2026-01-31');
    await refresh();
    const before = currency('2026-01', 'JPY');
    expect(before).toMatchObject({
      holdingsValue: 99,
      marketHoldings: 100,
      accountRounding: -1,
      unreserved: 2,
      marketUnreserved: 67,
      pocketTotal: 33,
    });
    expect(laneValues('2026-01', 'JPY')).toEqual({ travelJpy: 33 });
    expect(toBudget('2026-01')).toBe(66);
    await lane('foodJpy', 'food', 'JPY.0');
    await retireLane({ lane: 'travelJpy', owner: 'foodJpy' });
    await refresh();
    expect(currency('2026-01', 'JPY').pocketTotal).toBe(33);
    expect(laneValues('2026-01', 'JPY')).toEqual({
      travelJpy: 33,
      foodJpy: 0,
    });
    expect(toBudget('2026-01')).toBe(66);
    expectIdentity('2026-01');
  });

  it('F1 full reservation, allocation tie to the smaller id', async () => {
    await income('jpy', '2026-01-05', 66, 2);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', 1, 33, '2026-01-31');
    await assign('laneB', '2026-01', 1, 33, '2026-01-31');
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      marketHoldings: 67,
      unreserved: 0,
      pocketTotal: 67,
    });
    expect(laneValues('2026-01', 'JPY')).toEqual({ laneA: 34, laneB: 33 });
    expect(value('2026-01', 'fx-changes')).toBe(1);
    expect(toBudget('2026-01')).toBe(0);
    expectIdentity('2026-01');
  });

  it('F2 full reservation across accounts leaves D', async () => {
    await income('jpy', '2026-01-05', 33, 1);
    await income('jpy2', '2026-01-05', 33, 1);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 2, 67, '2026-01-31');
    await refresh();
    const jpy = currency('2026-01', 'JPY');
    expect(jpy.pocketTotal).toBe(67);
    expect(jpy.accountRounding).toBe(-1);
    expect(toBudget('2026-01')).toBe(-1);
    expect(jpy.lanes[0]).toMatchObject({ assignedBase: 67, reservationFx: 0 });
    expectIdentity('2026-01');
  });

  it('N1 signed net zero', async () => {
    await income('jpy', '2026-01-05', 33, 1);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', 1, 33, '2026-01-31');
    await row('jpy', '2026-01-10', -33, -1, 'food');
    await refresh();
    const jan = currency('2026-01', 'JPY');
    expect(jan).toMatchObject({
      holdings: 0,
      reserved: 0,
      unreserved: 0,
      rule: 1,
      pocketTotal: 0,
      spentBase: -33,
      writtenChange: 33,
    });
    expect(toBudget('2026-01')).toBe(0);
    expect(laneValues('2026-01', 'JPY')).toEqual({ laneA: 33, laneB: -33 });
    expectIdentity('2026-01');
    const feb = currency('2026-02', 'JPY');
    expect(feb).toMatchObject({
      reserved: 1,
      holdings: 0,
      unreserved: -1,
      marketUnreserved: -33,
      rule: 2,
      pocketTotal: 33,
      writtenChange: 33,
    });
    expect(toBudget('2026-02')).toBe(-33);
    expectIdentity('2026-02');
  });

  it('N2 three lanes, unchanged by deleting B into C', async () => {
    await income('jpy', '2026-01-05', 67, 2);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await lane('laneC', 'shop', 'JPY.0');
    await row('jpy', '2026-01-10', -33, -1, 'travel');
    await assign('laneB', '2026-01', 1, 33, '2026-01-31');
    await assign('laneC', '2026-01', 1, 33, '2026-01-31');
    const check = () => {
      expect(currency('2026-01', 'JPY')).toMatchObject({
        holdings: 1,
        bookedHoldings: 34,
        reserved: 1,
        unreserved: 0,
        marketHoldings: 33,
        holdingsValue: 33,
        pocketTotal: 33,
        spentBase: -33,
        writtenChange: 66,
      });
      expect(value('2026-01', 'fx-changes')).toBe(-1);
      expect(toBudget('2026-01')).toBe(0);
      expect(laneValues('2026-01', 'JPY')).toEqual({
        laneA: -33,
        laneB: 33,
        laneC: 33,
      });
      expect(currency('2026-02', 'JPY')).toMatchObject({
        unreserved: -1,
        pocketTotal: 66,
        writtenChange: 33,
      });
      expect(toBudget('2026-02')).toBe(-33);
      expectIdentity('2026-01');
      expectIdentity('2026-02');
    };
    await refresh();
    check();
    await retireLane({ lane: 'laneB', owner: 'laneC' });
    await refresh();
    check();
  });

  it('C6 mixed precision', async () => {
    await standing('IQD', '1300', '2025-12-01');
    await income('iqd3', '2026-01-05', 1000, 13000000);
    await income('iqd', '2026-01-05', 1000, 13000);
    await lane('travelIqd', 'travel', 'IQD.3');
    await lane('foodIqd', 'food', 'IQD.0');
    await assign('travelIqd', '2026-01', 6500000, 500, '2026-01-31', 'IQD.3');
    await assign('foodIqd', '2026-01', 6500, 500, '2026-01-31', 'IQD.0');
    await refresh();
    expect(currency('2026-01', 'IQD')).toMatchObject({
      precision: 3,
      holdings: 26000000,
      reserved: 13000000,
      unreserved: 13000000,
      holdingsValue: 2000,
      marketHoldings: 2000,
      accountRounding: 0,
      marketUnreserved: 1000,
      pocketTotal: 1000,
    });
    expect(laneValues('2026-01', 'IQD')).toEqual({
      travelIqd: 500,
      foodIqd: 500,
    });
    expect(toBudget('2026-01')).toBe(1000);
    expectIdentity('2026-01');
  });
});

describe('release, reset and recovery without rates (T1)', () => {
  beforeEach(async () => {
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, null, '2026-01-10');
  });

  function expectJanuary() {
    expect(currency('2026-01', 'JPY')).toMatchObject({
      holdings: 10000,
      bookedHoldings: 10000,
      includedFx: 0,
      includedValue: 10000,
      reserved: 10000,
      unreserved: 0,
      rule: 3,
      valuation: 'included-rate',
      pocketTotal: 10000,
      writtenChange: 10000,
    });
    expect(currency('2026-01', 'JPY').incomplete).toContain('rate-unavailable');
    expect(toBudget('2026-01')).toBe(0);
    expect(currency('2026-01', 'JPY').lanes[0]).toMatchObject({
      balanceBase: null,
      valueKind: 'unknown',
      budgetedBase: null,
    });
    expectIdentity('2026-01');
  }

  it('K1 no rate ever, full reservation, pending base', async () => {
    await refresh();
    expectJanuary();
  });

  it('RL1 full unassignment', async () => {
    await assign('travelJpy', '2026-02', -10000, null, '2026-02-28');
    await refresh();
    expectJanuary();
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 0,
      rule: 1,
      pocketTotal: 0,
      writtenChange: -10000,
    });
    expect(toBudget('2026-02')).toBe(10000);
    expect(value('2026-02', 'fx-incomplete')).toBe(true);
    expectIdentity('2026-02');
  });

  it('RL2 overspend and reset', async () => {
    await row('jpy', '2026-02-10', -20000, -20000, 'travel');
    await refresh();
    expectJanuary();
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: -10000,
      unreserved: 0,
      includedValue: -10000,
      rule: 3,
      pocketTotal: -10000,
      spentBase: -20000,
      writtenChange: 0,
    });
    expect(toBudget('2026-02')).toBe(0);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      reserved: 0,
      rule: 1,
      pocketTotal: 0,
      writtenChange: 10000,
    });
    expect(toBudget('2026-03')).toBe(-10000);
    // The carry rule discards the overspent -10000: reset is that amount.
    expect(currency('2026-03', 'JPY').lanes[0]).toMatchObject({
      carryIn: 0,
      reset: -10000,
      balance: 0,
    });
    expectIdentity('2026-02');
    expectIdentity('2026-03');
  });

  it('RL3 spending inside the reservation', async () => {
    await row('jpy', '2026-02-10', -3000, -3000, 'travel');
    await refresh();
    expect(currency('2026-02', 'JPY')).toMatchObject({
      holdings: 7000,
      includedValue: 7000,
      reserved: 7000,
      unreserved: 0,
      pocketTotal: 7000,
      spentBase: -3000,
      writtenChange: 0,
    });
    expect(toBudget('2026-02')).toBe(0);
    expectIdentity('2026-02');
  });

  async function recover() {
    await assign('travelJpy', '2026-02', -4000, null, '2026-02-28');
    await standing('JPY', '80', '2026-03-01');
    await refresh();
  }

  function expectRecovered() {
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 6000,
      unreserved: 4000,
      rule: 3,
      pocketTotal: 6000,
      writtenChange: -4000,
    });
    expect(toBudget('2026-02')).toBe(4000);
    expect(value('2026-03', 'fx-changes')).toBe(2500);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      includedFx: 2500,
      gap: 2500,
      excludedFx: 0,
      valuation: 'market',
      marketHoldings: 12500,
      marketUnreserved: 5000,
      pocketTotal: 7500,
      writtenChange: 1500,
    });
    expect(toBudget('2026-03')).toBe(5000);
    expect(laneValues('2026-03', 'JPY')).toEqual({ travelJpy: 7500 });
    expect(laneValues('2026-01', 'JPY')).toEqual({ travelJpy: null });
    expect(laneValues('2026-02', 'JPY')).toEqual({ travelJpy: null });
    for (const month of ['2026-01', '2026-02', '2026-03']) {
      expectIdentity(month);
    }
  }

  it('RL4 partial release and recovery', async () => {
    await recover();
    expectRecovered();
  });

  it('RL5 finalization after recovery changes no P', async () => {
    await recover();
    // No entry rate exists at either capture date.
    expect(
      await finalizePocketAssignments({
        cells: [{ id: '202601-travelJpy' }, { id: '202602-travelJpy' }],
      }),
    ).toEqual({
      finalized: [],
      pending: [
        { id: '202601-travelJpy', reason: 'rate-unavailable' },
        { id: '202602-travelJpy', reason: 'rate-unavailable' },
      ],
    });
    expect(
      await finalizePocketAssignments({
        cells: [
          { id: '202601-travelJpy', baseAmount: 10000 },
          { id: '202602-travelJpy', baseAmount: -4000 },
        ],
      }),
    ).toEqual({
      finalized: ['202601-travelJpy', '202602-travelJpy'],
      pending: [],
    });
    await refresh();
    expectRecovered();
    expect(currency('2026-03', 'JPY').lanes[0]).toMatchObject({
      assignedBase: 6000,
      reservationFx: 1500,
    });
  });

  it('RL6 holdings spent elsewhere', async () => {
    await row('jpy', '2026-02-10', -10000, -10000, 'food');
    await refresh();
    expect(currency('2026-02', 'JPY')).toMatchObject({
      holdings: 0,
      includedValue: 0,
      reserved: 10000,
      unreserved: -10000,
      rule: 4,
      valuation: 'last-unit-value',
      carriedFrom: '2026-01',
      pocketTotal: 10000,
      writtenChange: 0,
      backing: { reserved: 10000, held: 0, shortage: true },
    });
    expect(currency('2026-02', 'JPY').incomplete).toContain(
      'reservation-unvalued',
    );
    expect(value('2026-02', 'leftover-food')).toBe(-10000);
    expect(toBudget('2026-02')).toBe(0);
    expect(toBudget('2026-03')).toBe(-10000);
    expectIdentity('2026-02');
    expectIdentity('2026-03');
    await standing('JPY', '100', '2026-03-01');
    await refresh();
    expect(currency('2026-03', 'JPY')).toMatchObject({
      valuation: 'market',
      pocketTotal: 10000,
      writtenChange: 0,
    });
  });
});

describe('missing rates (S3)', () => {
  it('K2 no rate, signed net zero', async () => {
    await income('jpy', '2026-01-05', 33, 1);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', 1, 33, '2026-01-31');
    await row('jpy', '2026-01-10', -33, -1, 'food');
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      holdings: 0,
      reserved: 0,
      rule: 1,
      valuation: 'unreserved',
      pocketTotal: 0,
    });
    expect(toBudget('2026-01')).toBe(0);
    expect(laneValues('2026-01', 'JPY')).toEqual({ laneA: null, laneB: null });
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 1,
      holdings: 0,
      rule: 5,
      valuation: 'unvalued',
      pocketTotal: 0,
      backing: { reserved: 1, held: 0, shortage: true },
    });
    expect(currency('2026-02', 'JPY').incomplete).toContain(
      'reservation-unvalued',
    );
    expect(toBudget('2026-02')).toBe(0);
    expectIdentity('2026-01');
    expectIdentity('2026-02');
  });

  async function k3() {
    await income('jpy', '2026-01-01', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, null, '2026-01-10');
    await standing('JPY', '80', '2026-01-31');
  }

  it('K3 close known, entry missing', async () => {
    await k3();
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      valuation: 'market',
      pocketTotal: 12500,
    });
    expect(value('2026-01', 'fx-changes')).toBe(2500);
    expect(value('2026-01', 'reservation-incomplete')).toBe(false);
    expect(toBudget('2026-01')).toBe(0);
    expect(currency('2026-01', 'JPY').lanes[0]).toMatchObject({
      balanceBase: 12500,
      budgetedBase: null,
      assignedBase: null,
      reservationFx: null,
    });
    expectIdentity('2026-01');
  });

  async function k4() {
    clock.today = '2026-02-14';
    await fetched('JPY', '100', '2026-01-10T00:00:00.000Z');
    await fetched('JPY', '80', '2026-02-14T00:00:00.000Z');
    await income('jpy', '2026-01-10', 10000, 10000);
  }

  it('K4 entry known, close missing', async () => {
    await k4();
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, 10000, '2026-01-31');
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      rule: 3,
      unreserved: 0,
      pocketTotal: 10000,
    });
    expect(toBudget('2026-01')).toBe(0);
    expect(currency('2026-02', 'JPY')).toMatchObject({
      valuation: 'market',
      pocketTotal: 12500,
      writtenChange: 2500,
    });
    expect(value('2026-02', 'fx-changes')).toBe(2500);
    expect(toBudget('2026-02')).toBe(0);
    expectIdentity('2026-01');
    expectIdentity('2026-02');
  });

  it('K5 reset at an unresolved close', async () => {
    await k4();
    await lane('travelJpy', 'travel', 'JPY.0');
    await row('jpy', '2026-01-12', -3000, -3000, 'travel');
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      holdings: 7000,
      includedValue: 7000,
      reserved: -3000,
      unreserved: 10000,
      rule: 3,
      pocketTotal: -3000,
      spentBase: -3000,
      writtenChange: 0,
    });
    expect(toBudget('2026-01')).toBe(10000);
    expect(laneValues('2026-01', 'JPY')).toEqual({ travelJpy: null });
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 0,
      pocketTotal: 0,
      writtenChange: 3000,
      marketUnreserved: 8750,
    });
    expect(value('2026-02', 'fx-changes')).toBe(1750);
    expect(toBudget('2026-02')).toBe(8750);
    expectIdentity('2026-01');
    expectIdentity('2026-02');
  });

  it('K6 healthy beside broken', async () => {
    await k3();
    await income('kwd', '2026-01-05', 10000, 30000);
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      includedFx: 2500,
      excludedFx: 0,
      valuation: 'market',
    });
    expect(currency('2026-01', 'KWD')).toMatchObject({
      includedValue: 10000,
      valuation: 'unreserved',
    });
    expect(value('2026-01', 'fx-changes')).toBe(2500);
    expect(value('2026-01', 'fx-incomplete')).toBe(true);
    expect(toBudget('2026-01')).toBe(10000);
    expectIdentity('2026-01');
  });
});

describe('overflow (T2)', () => {
  async function euro() {
    await standing('EUR', '0.8', '2025-12-01');
    await income('eur', '2026-01-05', 10000, 8000);
    await lane('foodEur', 'food', 'EUR.2');
    await assign('foodEur', '2026-01', 4000, 5000, '2026-01-31', 'EUR.2');
  }

  it('OV1 full reservation across an excluded aggregate', async () => {
    await standing('JPY', '100', '2026-01-20');
    await income('jpy', '2026-01-05', 1, m);
    await income('jpy2', '2026-01-05', 1, m);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', m, null, '2026-01-10');
    await assign('laneB', '2026-01', m, null, '2026-01-10');
    await euro();
    await refresh();
    expect(value('2026-01', 'fx-changes')).toBe(0);
    expect(value('2026-01', 'fx-incomplete')).toBe(true);
    const jpy = currency('2026-01', 'JPY');
    expect(jpy).toMatchObject({
      includedFx: 0,
      holdingsValue: null,
      marketHoldings: null,
      gap: null,
      excludedFx: null,
      includedValue: 2,
      holdings: null,
      unreserved: 0,
      rule: 3,
      pocketTotal: 2,
      writtenChange: 2,
    });
    expect(jpy.incomplete).toEqual(
      expect.arrayContaining(['fx-excluded', 'amount-out-of-range']),
    );
    expect(currency('2026-01', 'EUR')).toMatchObject({
      gap: 0,
      includedFx: 0,
      excludedFx: 0,
      valuation: 'market',
      marketHoldings: 10000,
      marketUnreserved: 5000,
      pocketTotal: 5000,
      writtenChange: 5000,
    });
    expect(value('2026-01', 'reservation-changes')).toBe(5002);
    expect(toBudget('2026-01')).toBe(5000);
    expectIdentity('2026-01');
    expect(currency('2026-02', 'JPY')).toMatchObject({
      rule: 3,
      pocketTotal: 2,
      writtenChange: 0,
    });
    expect(value('2026-02', 'fx-incomplete')).toBe(true);
    expect(toBudget('2026-02')).toBe(5000);
    expect(currency('2026-02', 'EUR').writtenChange).toBe(0);
    expectIdentity('2026-02');
  });

  it('OV2 net catch-up', async () => {
    await standing('JPY', '100', '2025-12-01');
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', m, null, '2026-01-10');
    await assign('laneB', '2026-01', m, null, '2026-01-10');
    await euro();
    await assign('laneB', '2026-02', -m, null, '2026-02-28');
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      holdings: 0,
      reserved: null,
      valuation: 'market',
      pocketTotal: null,
      exactChange: null,
      writtenChange: 0,
      includedReservation: 0,
      backing: { reserved: null, held: 0, shortage: true },
    });
    expect(currency('2026-01', 'JPY').incomplete).toContain(
      'reservation-incomplete',
    );
    expect(value('2026-01', 'reservation-incomplete')).toBe(true);
    expect(currency('2026-01', 'EUR').writtenChange).toBe(5000);
    expect(toBudget('2026-01')).toBe(5000);
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: m,
      pocketTotal: m,
      writtenChange: m,
      includedReservation: m,
      backing: { reserved: m, held: 0, shortage: true },
    });
    expect(value('2026-02', 'reservation-incomplete')).toBe(false);
    expect(currency('2026-02', 'EUR').writtenChange).toBe(0);
    expect(toBudget('2026-02')).toBe(5000 - m);
    expectIdentity('2026-02');
  });

  it('OV3 opposite excluded aggregates', async () => {
    await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-05', 1, m);
    await income('jpy2', '2026-01-05', 1, m);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 100, 100, '2026-01-31');
    await row('jpy', '2026-02-05', -1, -m, 'food');
    await row('jpy2', '2026-02-05', -1, -m, 'food');
    await refresh();
    expect(value('2026-01', 'fx-changes')).toBe(0);
    expect(currency('2026-01', 'JPY')).toMatchObject({
      includedValue: 2,
      includedFx: 0,
      reserved: 100,
      rule: 3,
      pocketTotal: 0,
      writtenChange: 0,
    });
    expect(currency('2026-01', 'JPY').incomplete).toContain('fx-excluded');
    expect(toBudget('2026-01')).toBe(2);
    expect(value('2026-02', 'fx-changes')).toBe(0);
    expect(currency('2026-02', 'JPY')).toMatchObject({
      includedFx: 0,
      gap: 0,
      excludedFx: 0,
      valuation: 'market',
      pocketTotal: 100,
      writtenChange: 100,
      backing: { reserved: 100, held: 0, shortage: true },
    });
    expect(toBudget('2026-02')).toBe(-98);
    expect(value('2026-02', 'leftover-food')).toBe(-2);
    expect(laneValues('2026-02', 'JPY')).toEqual({ travelJpy: 100 });
    expect(toBudget('2026-03')).toBe(-100);
    expect(currency('2026-03', 'JPY').writtenChange).toBe(0);
    for (const month of ['2026-01', '2026-02', '2026-03']) {
      expectIdentity(month);
    }
  });

  it('SB1 an out-of-range spent base still feeds X exactly', async () => {
    await standing('JPY', '100', '2025-12-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await row('jpy', '2026-01-10', -m, -1, 'travel');
    await row('jpy', '2026-01-11', -1, -1, 'travel');
    await refresh();
    const jan = currency('2026-01', 'JPY');
    expect(jan.lanes[0]).toMatchObject({ spent: -2, spentBase: null });
    expect(jan).toMatchObject({
      spentBase: null,
      bookedHoldings: null,
      includedValue: null,
      pocketTotal: null,
      rule: 3,
      exactChange: 0,
      writtenChange: 0,
    });
    expect(jan.incomplete).toContain('amount-out-of-range');
    expect(toBudget('2026-01')).toBe(0);
    // February releases -(m + 1), which is out of range: caught up later.
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 0,
      exactChange: null,
      writtenChange: 0,
    });
    expect(value('2026-02', 'reservation-incomplete')).toBe(true);
    expectIdentity('2026-01');
    expectIdentity('2026-02');
  });
});

describe('future and current planning (S6, T3)', () => {
  beforeEach(async () => {
    clock.today = '2026-01-15';
  });

  async function held(rate = true) {
    if (rate) await standing('JPY', '100', '2025-12-01');
    await income('jpy', '2026-01-02', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
  }

  it('FU1 future spending', async () => {
    await held();
    await row('jpy', '2026-03-10', -10000, -10000, 'travel');
    await refresh();
    expect(currency('2026-01', 'JPY').pocketTotal).toBe(0);
    expect(toBudget('2026-01')).toBe(10000);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      valuationDate: '2026-01-15',
      holdings: 0,
      reserved: -10000,
      unreserved: 10000,
      pocketTotal: -10000,
      spentBase: -10000,
      writtenChange: 0,
      accountRounding: 0,
      planning: 0,
    });
    expect(laneValues('2026-03', 'JPY')).toEqual({ travelJpy: -10000 });
    expect(toBudget('2026-03')).toBe(10000);
    expect(currency('2026-04', 'JPY')).toMatchObject({
      pocketTotal: 0,
      writtenChange: 10000,
    });
    expect(toBudget('2026-04')).toBe(0);
    expectIdentity('2026-03');
    expectIdentity('2026-04');
  });

  it('FU2 future income', async () => {
    await held();
    await income('jpy', '2026-03-10', 10000, 10000);
    await refresh();
    expect(toBudget('2026-03')).toBe(20000);
    expect(currency('2026-03', 'JPY').pocketTotal).toBe(0);
    expectIdentity('2026-03');
  });

  it('FU3 future assignment', async () => {
    await held();
    await assign('travelJpy', '2026-03', 10000, 10000, '2026-01-15');
    await refresh();
    expect(currency('2026-03', 'JPY')).toMatchObject({
      unreserved: 0,
      valuation: 'market',
      pocketTotal: 10000,
    });
    expect(toBudget('2026-03')).toBe(0);
    expect(value('2026-02', 'fx-changes')).toBe(0);
    expect(value('2026-03', 'fx-changes')).toBe(0);
    expectIdentity('2026-03');
  });

  it('FU7 base independence', async () => {
    await held();
    await assign('travelJpy', '2026-03', 5000, 2000, '2026-01-15');
    await refresh();
    expect(currency('2026-03', 'JPY')).toMatchObject({
      pocketTotal: 5000,
      writtenChange: 5000,
    });
    expect(toBudget('2026-03')).toBe(5000);
    expect(currency('2026-03', 'JPY').lanes[0]).toMatchObject({
      assignedBase: 2000,
      reservationFx: 3000,
    });
    await assign('travelJpy', '2026-03', 5000, 5000, '2026-01-15');
    await refresh();
    expect(toBudget('2026-03')).toBe(5000);
    expect(currency('2026-03', 'JPY').lanes[0]).toMatchObject({
      assignedBase: 5000,
      reservationFx: 0,
    });
  });

  async function pl1(native = 10000, base = 10000, rate = true) {
    await held(rate);
    await income('jpy', '2026-03-10', 8000, 10000);
    await assign('travelJpy', '2026-03', native, base, '2026-01-15');
    await refresh();
  }

  it('PL1 differently booked future income', async () => {
    await pl1();
    expect(currency('2026-03', 'JPY')).toMatchObject({
      holdings: 20000,
      bookedHoldings: 18000,
      heldAtValuation: 10000,
      bookedAtValuation: 10000,
      reserved: 10000,
      unreserved: 10000,
      marketHoldings: 20000,
      marketUnreserved: 10000,
      pocketTotal: 10000,
      accountRounding: 0,
      planning: -2000,
      writtenChange: 10000,
    });
    expect(toBudget('2026-03')).toBe(8000);
    expect(value('2026-02', 'fx-changes')).toBe(0);
    expect(value('2026-03', 'fx-changes')).toBe(0);
    expectIdentity('2026-03');
  });

  it('PL2 full planned reservation', async () => {
    await pl1(20000, 20000);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      unreserved: 0,
      pocketTotal: 20000,
      accountRounding: 0,
      planning: -2000,
    });
    expect(toBudget('2026-03')).toBe(-2000);
    expectIdentity('2026-03');
  });

  it('PL3 current month after today', async () => {
    await held();
    await income('jpy', '2026-01-25', 8000, 10000);
    await assign('travelJpy', '2026-01', 10000, 10000, '2026-01-15');
    await refresh();
    expect(currency('2026-01', 'JPY')).toMatchObject({
      holdings: 20000,
      bookedHoldings: 18000,
      pocketTotal: 10000,
      planning: -2000,
    });
    expect(toBudget('2026-01')).toBe(8000);
    expect(value('2026-01', 'fx-changes')).toBe(0);
    expectIdentity('2026-01');
  });

  it('PL4 no rate', async () => {
    await pl1(10000, 10000, false);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      rule: 3,
      includedValue: 18000,
      pocketTotal: 9000,
      accountRounding: null,
      planning: null,
    });
    expect(currency('2026-03', 'JPY').incomplete).toContain('rate-unavailable');
    expect(toBudget('2026-03')).toBe(9000);
    expectIdentity('2026-03');
  });

  it('FU4 unknown today rate', async () => {
    await held(false);
    await assign('travelJpy', '2026-03', 10000, null, '2026-01-15');
    await refresh();
    expect(currency('2026-03', 'JPY')).toMatchObject({
      rule: 3,
      unreserved: 0,
      pocketTotal: 10000,
    });
    expect(toBudget('2026-03')).toBe(0);
    await assign('travelJpy', '2026-03', 4000, null, '2026-01-15');
    await refresh();
    expect(currency('2026-03', 'JPY')).toMatchObject({
      unreserved: 6000,
      pocketTotal: 4000,
    });
    expect(toBudget('2026-03')).toBe(6000);
  });

  it('FU5 event boundaries', async () => {
    await held(false);
    await assign('travelJpy', '2026-03', 10000, null, '2026-01-15');
    await refresh();
    expect(toBudget('2026-01')).toBe(10000);
    expect(toBudget('2026-02')).toBe(10000);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      rule: 3,
      pocketTotal: 10000,
      writtenChange: 10000,
    });
    expect(toBudget('2026-03')).toBe(0);
    expect(laneValues('2026-03', 'JPY')).toEqual({ travelJpy: null });

    await fetched('JPY', '80', '2026-01-15T00:00:00.000Z');
    await refresh();
    expect(value('2026-01', 'fx-changes')).toBe(2500);
    expect(currency('2026-01', 'JPY')).toMatchObject({
      includedFx: 2500,
      excludedFx: 0,
    });
    expect(toBudget('2026-01')).toBe(12500);
    expect(toBudget('2026-02')).toBe(12500);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      valuation: 'market',
      marketHoldings: 12500,
      pocketTotal: 12500,
      writtenChange: 12500,
    });
    expect(toBudget('2026-03')).toBe(0);

    expect(
      await finalizePocketAssignments({
        cells: [{ id: '202603-travelJpy' }],
      }),
    ).toEqual({ finalized: ['202603-travelJpy'], pending: [] });
    expect(
      db.firstSync<{ budget_pair: string }>(
        "SELECT budget_pair FROM pocket_budgets WHERE id = '202603-travelJpy'",
      )!.budget_pair,
    ).toBe('10000:12500~JPY.0@2026-01-15');
    await refresh();
    expect(currency('2026-03', 'JPY').pocketTotal).toBe(12500);
    for (const month of ['2026-01', '2026-02', '2026-03']) {
      expect(toBudget(month)).toBe(month === '2026-03' ? 0 : 12500);
    }
    expect(currency('2026-03', 'JPY').lanes[0]).toMatchObject({
      assignedBase: 12500,
      reservationFx: 0,
    });
  });

  it('FU6 day transition', async () => {
    await held();
    await standing('JPY', '80', '2026-02-20');
    await assign('travelJpy', '2026-03', 10000, 10000, '2026-01-15');
    await refresh();
    expect(currency('2026-02', 'JPY').valuationDate).toBe('2026-01-15');
    expect(currency('2026-03', 'JPY')).toMatchObject({
      valuationDate: '2026-01-15',
      pocketTotal: 10000,
    });
    clock.today = '2026-03-01';
    await refresh();
    expect(currency('2026-02', 'JPY').valuationDate).toBe('2026-02-28');
    expect(currency('2026-03', 'JPY')).toMatchObject({
      valuationDate: '2026-03-01',
      pocketTotal: 12500,
    });
  });
});

describe('frozen bases and capture date (S7)', () => {
  it('MR1 finalizes at the stored date and stays frozen', async () => {
    await income('jpy', '2026-01-01', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, null, '2026-01-10');
    await standing('JPY', '80', '2026-01-31');
    await standing('JPY', '100', '2026-01-10');
    await refresh();
    const pair = () =>
      db.firstSync<{ budget_pair: string; base_amount: number | null }>(
        "SELECT budget_pair, base_amount FROM pocket_budgets WHERE id = '202601-travelJpy'",
      )!;
    // No finalization on load or refresh.
    expect(pair().base_amount).toBe(null);
    const before = toBudget('2026-01');
    await finalizePocketAssignments({ cells: [{ id: '202601-travelJpy' }] });
    expect(pair()).toEqual({
      budget_pair: '10000:10000~JPY.0@2026-01-10',
      base_amount: 10000,
    });
    await standing('JPY', '90', '2026-01-10');
    await refresh();
    expect(pair().base_amount).toBe(10000);
    expect(toBudget('2026-01')).toBe(before);
  });

  it('MR2 uses the capture date, not the finalization day', async () => {
    clock.today = '2026-02-10';
    await income('jpy', '2026-01-01', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-03', 10000, null, '2026-01-10');
    await standing('JPY', '100', '2026-01-10');
    await standing('JPY', '80', '2026-02-10');
    await finalizePocketAssignments({ cells: [{ id: '202603-travelJpy' }] });
    expect(
      db.firstSync<{ base_amount: number }>(
        "SELECT base_amount FROM pocket_budgets WHERE id = '202603-travelJpy'",
      )!.base_amount,
    ).toBe(10000);
  });

  it.each([
    ['A first', false],
    ['B first', true],
  ])('MR3 concurrent pending pairs stay coherent (%s)', async (_, bFirst) => {
    await lane('travelJpy', 'travel', 'JPY.0');
    const a = '10000:~JPY.0@2026-01-10';
    const b = '8000:~JPY.0@2026-01-12';
    const messages = [a, b].map(pair => [
      remote('pocket_budgets', '202601-travelJpy', 'month', 202601),
      remote('pocket_budgets', '202601-travelJpy', 'lane', 'travelJpy'),
      remote('pocket_budgets', '202601-travelJpy', 'budget_pair', pair),
    ]);
    // The later timestamp wins the whole pair, whatever the arrival order.
    const [first, second] = bFirst ? [messages[0], messages[1]] : messages;
    await applyMessages(bFirst ? [...second, ...first] : [...first, ...second]);
    expect(
      db.firstSync(
        "SELECT amount, capture_date FROM pocket_budgets WHERE id = '202601-travelJpy'",
      ),
    ).toEqual({ amount: 8000, capture_date: '2026-01-12' });
  });

  it('MM1 a mismatched stamp makes R unknown until re-entry', async () => {
    await standing('JPY', '100', '2025-12-01');
    await standing('KWD', '0.3', '2025-12-01');
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 4000, 4000, '2026-01-31');
    // A KWD currency elsewhere: 30.000 held, 15.000 reserved in Food.
    await income('kwd', '2026-01-05', 10000, 30000);
    await lane('foodKwd', 'food', 'KWD.3');
    await assign('foodKwd', '2026-01', 15000, 5000, '2026-01-31', 'KWD.3');
    await refresh();
    expect(currency('2026-01', 'JPY').pocketTotal).toBe(4000);
    // The fixture's 60.00, plus KWD's 50.00 of funds.
    expect(toBudget('2026-01')).toBe(11000);

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
    for (const month of ['2026-02', '2026-03']) {
      const jpy = currency(month, 'JPY');
      expect(jpy).toMatchObject({
        reserved: null,
        valuation: 'unknown-native',
        pocketTotal: 4000,
        writtenChange: 0,
        includedReservation: 4000,
      });
      expect(jpy.incomplete).toEqual(
        expect.arrayContaining([
          'pair-encoding-mismatch',
          'reservation-incomplete',
        ]),
      );
      expect(laneValues(month, 'JPY')).toEqual({ travelJpy: null });
      expect(jpy.lanes[0].balance).toBe(null);
      expect(currency(month, 'KWD').valuation).toBe('market');
    }
    expect(currency('2026-02', 'JPY').lanes[0].budgeted).toBe(null);
    expect(value('2026-02', 'reservation-incomplete')).toBe(true);
    expect(toBudget('2026-02')).toBe(11000);
    expectIdentity('2026-02');

    await assign('travelJpy', '2026-02', 1000, 1000, '2026-02-28');
    await refresh();
    expect(currency('2026-02', 'JPY')).toMatchObject({
      reserved: 5000,
      pocketTotal: 5000,
      writtenChange: 1000,
    });
    expect(toBudget('2026-02')).toBe(10000);
    expectIdentity('2026-02');
  });
});

describe('inspection 1 regressions', () => {
  it('carries an assignment made before the first created month', async () => {
    // No rows: the budget's first sheet is March (three months before June).
    await standing('JPY', '100', '2025-12-01');
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 100, 100, '2026-01-31');
    await refresh();
    expect(sheet.get().meta().createdMonths.has('2026-02')).toBe(false);
    expect(reservationDetails('2026-01')).toEqual([]);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      reserved: 100,
      pocketTotal: 100,
      writtenChange: 100,
      includedReservation: 100,
    });
    expect(toBudget('2026-03')).toBe(-100);
    expect(currency('2026-04', 'JPY')).toMatchObject({
      reserved: 100,
      writtenChange: 0,
    });
    expectIdentity('2026-03');
  });

  it('walks a lane through months without a sheet (pure walker)', () => {
    const result = walkReservations({
      months: ['2026-02'],
      today: '2026-06-15',
      basePrecision: 2,
      accounts: [],
      rowsOf: () => [],
      lanes: [{ id: 'travelJpy', encoding: 'JPY.0', tombstone: false }],
      laneRows: [],
      cells: [
        {
          lane: 'travelJpy',
          month: '2026-01',
          native: 100,
          stamp: 'JPY.0',
          base: 100,
          captureDate: '2026-01-31',
          carryover: false,
        },
      ],
      fx: [],
      rateOn: () => ({
        rate: '100',
        kind: 'standing',
        source: 'manual',
        timestamp: '2025-12-01T00:00:00.000Z',
        fallback: false,
      }),
    });
    expect([...result.keys()]).toEqual(['2026-02']);
    expect(result.get('2026-02')!.currencies[0]).toMatchObject({
      reserved: 100,
      pocketTotal: 100,
    });
  });

  it('keeps representable lane values beside an out-of-range total', async () => {
    await standing('JPY', '100', '2025-12-01');
    for (const id of ['gifts', 'rent']) {
      await db.insertCategory({ id, name: id, cat_group: 'group' });
    }
    // A budget-currency row so January has a sheet; no JPY is held.
    await income('usd', '2026-01-05', 100, null);
    const lanes = ['travel', 'food', 'shop', 'gifts', 'rent'];
    for (const category of lanes) {
      await lane(`${category}Jpy`, category, 'JPY.0');
      await assign(`${category}Jpy`, '2026-01', m, null, '2026-01-10');
    }
    await refresh();
    const jan = currency('2026-01', 'JPY');
    expect(jan).toMatchObject({
      valuation: 'market',
      pocketTotal: null,
      exactChange: null,
      writtenChange: 0,
    });
    expect(value('2026-01', 'reservation-incomplete')).toBe(true);
    expect(laneValues('2026-01', 'JPY')).toEqual(
      Object.fromEntries(lanes.map(c => [`${c}Jpy`, m])),
    );
    for (const category of lanes) {
      expect(laneCell('2026-01', `${category}Jpy`)).toEqual([m, 'resolved']);
    }
  });

  it('commits lane value cells with an explicit unknown status', async () => {
    await standing('JPY', '3', '2025-12-01');
    await income('jpy', '2026-01-05', 66, 2);
    await lane('laneA', 'travel', 'JPY.0');
    await lane('laneB', 'food', 'JPY.0');
    await assign('laneA', '2026-01', 1, 33, '2026-01-31');
    await assign('laneB', '2026-01', 1, 33, '2026-01-31');
    await refresh();
    expect(laneCell('2026-01', 'laneA')).toEqual([34, 'resolved']);
    expect(laneCell('2026-01', 'laneB')).toEqual([33, 'resolved']);
    const summary = () =>
      ['2026-01', '2026-02'].map(month =>
        ['to-budget', 'fx-changes', 'reservation-changes'].map(name =>
          value(month, name),
        ),
      );
    const before = summary();
    // The same reservation in other lanes: no summary cell moves.
    await assign('laneA', '2026-01', 2, 67, '2026-01-31');
    await assign('laneB', '2026-01', 0, 0, '2026-01-31');
    await refresh();
    expect(summary()).toEqual(before);
    expect(laneCell('2026-01', 'laneA')).toEqual([67, 'resolved']);
    expect(laneCell('2026-01', 'laneB')).toEqual([0, 'resolved']);
  });

  it('marks a lane value unknown without a market rate', async () => {
    await income('jpy', '2026-01-05', 10000, 10000);
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 10000, null, '2026-01-10');
    await refresh();
    expect(laneCell('2026-01', 'travelJpy')).toEqual([0, 'unknown']);
  });
});

describe('inspection 2 regressions', () => {
  it('moves Pincl by spending in a month without a sheet', () => {
    const rate = {
      rate: '100',
      kind: 'standing' as const,
      source: 'manual',
      timestamp: '2025-12-01T00:00:00.000Z',
      fallback: false,
    };
    const accounts = [
      { id: 'jpy', name: 'Yen', currency: 'JPY', currency_precision: 0 },
    ];
    const rows = [
      { date: '2026-01-05', amount: 10000, transaction_amount: 10000 },
      { date: '2026-02-10', amount: -3000, transaction_amount: -3000 },
    ];
    const months = ['2026-01', '2026-03'];
    const today = '2026-06-15';
    const fx = walkFxValuation({
      accounts,
      rowsOf: () => rows,
      months,
      today,
      basePrecision: 2,
      rateOn: () => rate,
    });
    const result = walkReservations({
      months,
      today,
      basePrecision: 2,
      accounts,
      rowsOf: () => rows,
      lanes: [{ id: 'travelJpy', encoding: 'JPY.0', tombstone: false }],
      laneRows: [
        {
          lane: 'travelJpy',
          date: '2026-02-10',
          amount: -3000,
          native: -3000,
          stamp: 'JPY.0',
        },
      ],
      cells: [
        {
          lane: 'travelJpy',
          month: '2026-01',
          native: 10000,
          stamp: 'JPY.0',
          base: 10000,
          captureDate: '2026-01-31',
          carryover: false,
        },
      ],
      fx,
      rateOn: () => rate,
    });
    expect([...result.keys()]).toEqual(months);
    expect(result.get('2026-01')!.currencies[0]).toMatchObject({
      pocketTotal: 10000,
      writtenChange: 10000,
      includedReservation: 10000,
    });
    // Spending inside the reservation releases nothing.
    expect(result.get('2026-03')!.currencies[0]).toMatchObject({
      reserved: 7000,
      pocketTotal: 7000,
      spentBase: 0,
      writtenChange: 0,
      includedReservation: 7000,
    });
    expect(result.get('2026-03')!.changes).toBe(0);
  });

  it('values a reservation at a historical close before the first sheet', async () => {
    // Empty on-budget JPY accounts; a rate on January 31 only.
    await fetched('JPY', '100', '2026-01-31T00:00:00.000Z');
    await lane('travelJpy', 'travel', 'JPY.0');
    await assign('travelJpy', '2026-01', 100, 100, '2026-01-31');
    await refresh();
    expect(sheet.get().meta().createdMonths.has('2026-02')).toBe(false);
    expect(currency('2026-03', 'JPY')).toMatchObject({
      reserved: 100,
      pocketTotal: 100,
      rule: 4,
      valuation: 'last-unit-value',
      carriedFrom: '2026-01',
      writtenChange: 100,
    });
    expect(toBudget('2026-03')).toBe(-100);
    expectIdentity('2026-03');
  });
});
