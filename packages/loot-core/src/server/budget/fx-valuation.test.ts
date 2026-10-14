import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as exchangeRates from '#server/exchange-rates/app';
import {
  exchangeRateId,
  app as exchangeRatesApp,
} from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { amountPair } from '#server/sync/coupled-cells';
import * as monthUtils from '#shared/months';

import { createAllBudgets } from './base';
import { fxValuation, refreshFxChanges, stopFxDayWatch } from './fx-valuation';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

// Core tests run on 2017-01-01: December 2016 is a past month and January
// 2017 the current one, valued to today.

/** A fetched rate, which valuation uses. A one-day manual rate does not. */
async function saveFetched(quoteCurrency: string, rate: string, date: string) {
  const timestamp = `${date}T00:00:00.000Z`;
  await db.insert('exchange_rates', {
    id: exchangeRateId('USD', quoteCurrency, 'provider', 'fetched', timestamp),
    base_currency: 'USD',
    quote_currency: quoteCurrency,
    rate,
    kind: 'fetched',
    source: 'provider',
    timestamp,
    tombstone: 0,
  });
}

async function saveRate(
  quoteCurrency: string,
  rate: string,
  date: string,
  kind: 'standing' | 'dated' = 'standing',
) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind,
    date,
    replace: true,
  });
}

let order = 0;
function row(
  id: string,
  account: string,
  date: string,
  amount: number,
  native: number | null,
) {
  db.runQuery(
    `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
       amount_pair, isParent, isChild, tombstone, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
    [
      id,
      account,
      db.toDateRepr(date),
      amount,
      native,
      amountPair(amount, native, account, native === null ? '' : 'JPY.0'),
      order++,
    ],
  );
}

const fxCell = (month: string) =>
  sheet.getCellValue(monthUtils.sheetForMonth(month), 'fx-changes');
const cell = (month: string, name: string) =>
  sheet.getCellValue(monthUtils.sheetForMonth(month), name);

async function build() {
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
}

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
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
  await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
  await db.insertCategoryGroup({
    id: 'income',
    name: 'Income',
    is_income: 1,
  });
  await db.insertAccount({ id: 'usd', name: 'Checking' });
  await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  await db.insertAccount({
    id: 'savings',
    name: 'Yen savings',
    currency: 'JPY',
    offbudget: 1,
  });
});

afterEach(() => {
  stopFxDayWatch();
});

describe('the valuation bridge', () => {
  it('turns a rate move alone into an FX change, carried once', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await saveRate('JPY', '100', '2016-12-20');
    await build();
    // ¥15,000 booked at $100.00 is worth $150.00 at 100 by December's close.
    expect(fxCell('2016-11')).toBe(0);
    expect(fxCell('2016-12')).toBe(5000);
    expect(fxCell('2017-01')).toBe(0);
    expect(cell('2016-12', 'available-funds')).toBe(5000);
    // January receives it once, through December's To Budget.
    expect(cell('2017-01', 'from-last-month')).toBe(
      cell('2016-12', 'to-budget'),
    );
    expect(cell('2017-01', 'available-funds')).toBe(
      cell('2016-12', 'to-budget'),
    );
    // Posted pairs stay frozen.
    expect(
      db.firstSync(
        "SELECT amount, transaction_amount FROM transactions WHERE id = 'a'",
      ),
    ).toEqual({ amount: 10000, transaction_amount: 15000 });
  });

  it('books flows at their pairs and reconciles each month', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    row('b', 'jpy', '2016-12-05', 2000, 3000);
    row('c', 'jpy', '2016-12-15', -4000, -6000);
    const bridge = await fxValuation(['2016-11', '2016-12', '2017-01']);
    for (const month of bridge) {
      expect(month.posted).toBe(0);
      for (const account of month.accounts) {
        expect(account.flows).not.toBeNull();
        expect(account.opening! + account.flows! + account.posted).toBe(
          account.closing,
        );
      }
    }
    const december = bridge.find(m => m.month === '2016-12')!.accounts[0];
    expect(december).toMatchObject({
      opening: 10000,
      flows: -2000,
      closing: 8000,
      closeDate: '2016-12-31',
      rate: { rate: '150', kind: 'standing', source: 'manual' },
    });
  });

  it('values nothing before holdings exist, and an account that starts mid-month', async () => {
    await saveRate('JPY', '200', '2016-09-01');
    await saveRate('JPY', '150', '2016-12-01');
    row('a', 'jpy', '2016-12-10', 10000, 15000);
    const bridge = await fxValuation(['2016-11', '2016-12']);
    expect(bridge.find(m => m.month === '2016-11')).toMatchObject({
      posted: 0,
      accounts: [],
    });
    expect(bridge.find(m => m.month === '2016-12')!.posted).toBe(0);
  });

  it('values a negative balance with its sign', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', -10000, -15000);
    await saveRate('JPY', '100', '2016-12-20');
    const bridge = await fxValuation(['2016-11', '2016-12']);
    expect(bridge.find(m => m.month === '2016-12')!.posted).toBe(-5000);
  });

  it('does not value a close from a one-day rate', async () => {
    await saveRate('JPY', '150', '2016-10-31', 'dated');
    row('a', 'jpy', '2016-10-10', 10000, 15000);
    const bridge = await fxValuation(['2016-10']);
    expect(bridge.find(month => month.month === '2016-10')).toMatchObject({
      posted: 0,
      incomplete: true,
    });
  });

  it('carries the net past a close without a rate, and stops at an unvalued today', async () => {
    // October's fetch is the close day. December's is seven days earlier,
    // so it values December 31 and not today (2017-01-01).
    await saveFetched('JPY', '150', '2016-10-31');
    row('a', 'jpy', '2016-10-10', 10000, 15000);
    await saveFetched('JPY', '100', '2016-12-24');
    const bridge = await fxValuation([
      '2016-10',
      '2016-11',
      '2016-12',
      '2017-01',
    ]);
    const month = (m: string) => bridge.find(entry => entry.month === m)!;
    expect(month('2016-10')).toMatchObject({ posted: 0, incomplete: false });
    expect(month('2016-11')).toMatchObject({ posted: 0, incomplete: true });
    expect(month('2016-11').accounts[0].closing).toBeNull();
    // December posts the whole net since October's close, covering November.
    expect(month('2016-12')).toMatchObject({ posted: 5000, incomplete: false });
    expect(month('2016-12').accounts[0].covers).toEqual(['2016-11-30']);
    // Today (2017-01-01) has no rate: nothing is posted, the month incomplete.
    expect(month('2017-01')).toMatchObject({ posted: 0, incomplete: true });
    // The posted amounts sum to the gap at the latest resolved close.
    expect(bridge.reduce((sum, m) => sum + m.posted!, 0)).toBe(5000);
  });

  it('leaves out off-budget accounts and budget-currency accounts', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('s', 'savings', '2016-11-10', 10000, 15000);
    row('u', 'usd', '2016-11-10', 10000, null);
    await saveRate('JPY', '100', '2016-12-20');
    await build();
    expect(fxCell('2016-12')).toBe(0);
    // Moving the account on budget values it.
    await db.update('accounts', { id: 'savings', offbudget: 0 });
    await refreshFxChanges();
    await sheet.waitOnSpreadsheet();
    expect(fxCell('2016-12')).toBe(5000);
  });
});

describe('recalculation', () => {
  it('follows a historical rate correction after it is saved', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await build();
    expect(fxCell('2016-12')).toBe(0);
    await saveRate('JPY', '100', '2016-12-20');
    await vi.waitFor(
      async () => {
        await sheet.waitOnSpreadsheet();
        expect(fxCell('2016-12')).toBe(5000);
      },
      { timeout: 2000 },
    );
  });

  const settled = (check: () => void) =>
    vi.waitFor(
      async () => {
        await sheet.waitOnSpreadsheet();
        check();
      },
      { timeout: 2000 },
    );

  it('follows a row moved off the account, and a deleted account', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    row('b', 'jpy', '2016-11-12', 10000, 15000);
    await saveRate('JPY', '100', '2016-12-20');
    await build();
    expect(fxCell('2016-12')).toBe(10000);
    await db.update('transactions', {
      id: 'b',
      acct: 'usd',
      amount_pair: amountPair(10000, null, 'usd', ''),
    });
    await settled(() => expect(fxCell('2016-12')).toBe(5000));
    await db.update('accounts', { id: 'jpy', tombstone: 1 });
    await settled(() => expect(fxCell('2016-12')).toBe(0));
  });

  it("moves the current month's close when the day changes", async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await saveRate('JPY', '100', '2017-01-02');
    await build();
    expect(fxCell('2017-01')).toBe(0);
    const today = vi
      .spyOn(monthUtils, 'currentDay')
      .mockReturnValue('2017-01-02');
    onTestFinished(() => {
      today.mockRestore();
    });
    vi.advanceTimersByTime(60_000);
    await settled(() => expect(fxCell('2017-01')).toBe(5000));
  });

  it('does not duplicate the adjustment when funds are held for next month', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await saveRate('JPY', '100', '2016-12-20');
    await build();
    const withoutHold = cell('2017-01', 'to-budget');
    sheet.get().set(`${monthUtils.sheetForMonth('2016-12')}!buffered`, 3000);
    await sheet.waitOnSpreadsheet();
    expect(cell('2016-12', 'to-budget')).toBe(
      Number(cell('2016-12', 'available-funds')) - 3000,
    );
    expect(cell('2017-01', 'to-budget')).toBe(withoutHold);
  });
});

describe('budgets without valuation', () => {
  it('keeps a base-only budget at zero', async () => {
    row('u', 'usd', '2016-11-10', 10000, null);
    await build();
    expect(fxCell('2016-12')).toBe(0);
    expect(fxCell('2017-01')).toBe(0);
  });

  it('leaves tracking budgets without the cell', async () => {
    sheet.get().meta().budgetType = 'tracking';
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await build();
    expect(fxCell('2016-12')).toBeNull();
    expect(cell('2016-12', 'fx-incomplete')).toBeNull();
  });
});

describe('inspection round 1', () => {
  it('posts a gap that opened before the first month the budget has', async () => {
    await saveRate('JPY', '150', '2016-05-01');
    await saveRate('JPY', '100', '2016-08-01');
    row('a', 'jpy', '2016-06-01', 10000, 15000);
    // Months from October only: the gap opened in August.
    const bridge = await fxValuation(['2016-10', '2016-11', '2016-12']);
    expect(bridge.map(month => month.posted)).toEqual([0, 0, 0]);
    // The cell gets it in October; the account row still reconciles.
    expect(bridge[0]).toMatchObject({ posted: 0, broughtForward: 5000 });
    expect(bridge[0].accounts[0]).toMatchObject({
      opening: 15000,
      flows: 0,
      posted: 0,
      broughtForward: 5000,
      closing: 15000,
    });
  });

  it('treats an account without a recorded precision as unvalued', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    db.runQuery(
      "UPDATE accounts SET currency_precision = NULL WHERE id = 'jpy'",
    );
    const bridge = await fxValuation(['2016-11', '2016-12']);
    expect(bridge.every(month => month.incomplete && month.posted === 0)).toBe(
      true,
    );
  });
});

describe('Sol review regressions', () => {
  it('returns totals and the rates at both valuation dates', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    row('b', 'jpy', '2016-12-05', 2000, 3000);
    await saveRate('JPY', '100', '2016-12-20');
    const [month] = await fxValuation(['2016-12']);
    expect(month).toMatchObject({
      opening: 10000,
      flows: 2000,
      posted: 6000,
      broughtForward: 0,
      closing: 18000,
      incomplete: false,
    });
    expect(month.accounts[0]).toMatchObject({
      openDate: '2016-11-30',
      openingRate: { rate: '150', source: 'manual' },
      closeDate: '2016-12-31',
      rate: { rate: '100', source: 'manual' },
    });
  });

  it('finds the last resolved historical close before an unresolved opening', async () => {
    row('a', 'jpy', '2016-06-01', 10000, 15000);
    await saveFetched('JPY', '100', '2016-08-31');
    await saveFetched('JPY', '75', '2016-10-31');
    const [month] = await fxValuation(['2016-10']);
    expect(month).toMatchObject({
      opening: null,
      closing: 20000,
      flows: 0,
      posted: 5000,
      broughtForward: 5000,
    });
    expect(month.accounts[0]).toMatchObject({
      posted: 5000,
      broughtForward: 5000,
      covers: ['2016-09-30'],
    });
  });

  it('keeps an unrepresentable conversion unavailable and recovers at a later rate', async () => {
    row('a', 'jpy', '2016-11-01', 1, 1);
    await saveRate('JPY', '0.000000000000001', '2016-11-01');
    await saveRate('JPY', '100', '2016-12-01');
    const bridge = await fxValuation(['2016-11', '2016-12']);
    expect(bridge[0]).toMatchObject({
      closing: null,
      posted: 0,
      incomplete: true,
    });
    expect(bridge[0].accounts[0]).toMatchObject({
      closing: null,
      unavailableReason: 'amount-out-of-range',
    });
    expect(bridge[1]).toMatchObject({ closing: 1, posted: 0 });
    expect(bridge[1].accounts[0].covers).toEqual(['2016-11-30']);
    await expect(build()).resolves.toBeUndefined();
  });

  it('does not report an unsafe sum of individually representable valuations', async () => {
    await db.update('accounts', { id: 'savings', offbudget: 0 });
    await saveRate('JPY', '50', '2016-11-01');
    row('a', 'jpy', '2016-11-01', 0, 750000000000000);
    row('b', 'savings', '2016-11-01', 0, 750000000000000);
    const [month] = await fxValuation(['2016-11']);
    expect(month).toMatchObject({
      closing: null,
      posted: null,
      incomplete: true,
      unavailableReason: 'amount-out-of-range',
    });
    expect(month.accounts.map(account => account.posted)).toEqual([
      1500000000000000, 1500000000000000,
    ]);
  });

  it('keeps a conversion above spreadsheet bounds unavailable', async () => {
    row('a', 'jpy', '2016-11-01', 0, 1);
    await saveRate('JPY', '0.00000000000004', '2016-11-01');
    const [month] = await fxValuation(['2016-11']);
    expect(month).toMatchObject({ closing: null, posted: 0, incomplete: true });
    expect(month.accounts[0].unavailableReason).toBe('amount-out-of-range');
    await build();
    expect(fxCell('2016-11')).toBe(0);
    expect(cell('2016-11', 'to-budget')).toBe(0);
  });

  it('clears an old adjustment when the aggregate becomes unavailable', async () => {
    await saveRate('JPY', '50', '2016-11-01');
    row('a', 'jpy', '2016-11-01', 0, 750000000000000);
    await build();
    stopFxDayWatch();
    expect(fxCell('2016-11')).toBe(1500000000000000);
    db.runQuery("UPDATE accounts SET offbudget = 0 WHERE id = 'savings'");
    row('b', 'savings', '2016-11-01', 0, 750000000000000);
    await refreshFxChanges();
    await sheet.waitOnSpreadsheet();
    expect(fxCell('2016-11')).toBe(0);
    expect((await fxValuation(['2016-11']))[0].incomplete).toBe(true);
  });

  it('does not let a slower older pass overwrite a newer valuation', async () => {
    row('a', 'jpy', '2016-11-01', 10000, 15000);
    await saveRate('JPY', '150', '2016-11-01');
    await build();
    stopFxDayWatch();
    let notifyReached!: () => void;
    let releaseRead!: () => void;
    const reached = new Promise<void>(resolve => {
      notifyReached = resolve;
    });
    const release = new Promise<void>(resolve => {
      releaseRead = resolve;
    });
    const resolveRate = exchangeRates.resolveRate;
    const spy = vi
      .spyOn(exchangeRates, 'resolveRate')
      .mockImplementationOnce(async options => {
        const old = await resolveRate(options);
        notifyReached();
        await release;
        return old;
      });
    onTestFinished(() => {
      releaseRead();
      spy.mockRestore();
    });
    const oldPass = refreshFxChanges();
    await reached;
    db.runQuery(
      "UPDATE exchange_rates SET rate = '100' WHERE quote_currency = 'JPY'",
    );
    await refreshFxChanges();
    await sheet.waitOnSpreadsheet();
    expect(fxCell('2016-11')).toBe(5000);
    releaseRead();
    await oldPass;
    await sheet.waitOnSpreadsheet();
    expect(fxCell('2016-11')).toBe(5000);
  });

  it('revalues immediately when the day changes during a pass', async () => {
    await saveRate('JPY', '150', '2016-10-01');
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await saveRate('JPY', '100', '2017-01-02');
    await build();
    stopFxDayWatch();
    const today = vi
      .spyOn(monthUtils, 'currentDay')
      .mockReturnValueOnce('2017-01-01')
      .mockReturnValue('2017-01-02');
    onTestFinished(() => today.mockRestore());
    await refreshFxChanges();
    await vi.waitFor(
      async () => {
        await sheet.waitOnSpreadsheet();
        expect(fxCell('2017-01')).toBe(5000);
      },
      { timeout: 2000 },
    );
  });
});

describe('FX incomplete spreadsheet cells', () => {
  it('marks unavailable holdings and clears the marker after a rate recovers', async () => {
    row('a', 'jpy', '2016-11-10', 10000, 15000);
    await db.update('accounts', { id: 'jpy', closed: 1 });
    await build();
    expect(cell('2016-11', 'fx-incomplete')).toBe(true);
    expect(cell('2017-02', 'fx-incomplete')).toBe(false);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(
          monthUtils.prevMonth([...sheet.get().meta().createdMonths].sort()[0]),
        ),
        'fx-incomplete',
      ),
    ).toBe(false);
    await saveRate('JPY', '100', '2016-10-01');
    await refreshFxChanges();
    await sheet.waitOnSpreadsheet();
    expect(cell('2016-11', 'fx-incomplete')).toBe(false);
    expect(fxCell('2016-11')).toBe(5000);
  });

  it('marks an unrepresentable aggregate incomplete while contributing zero', async () => {
    await db.update('accounts', { id: 'savings', offbudget: 0 });
    await saveRate('JPY', '50', '2016-11-01');
    row('a', 'jpy', '2016-11-01', 0, 750000000000000);
    row('b', 'savings', '2016-11-01', 0, 750000000000000);
    await build();
    expect(fxCell('2016-11')).toBe(0);
    expect(cell('2016-11', 'fx-incomplete')).toBe(true);
  });

  it('creates complete zero cells for base-only months and no tracking cells', async () => {
    await build();
    expect(cell('2016-12', 'fx-incomplete')).toBe(false);
  });
});
