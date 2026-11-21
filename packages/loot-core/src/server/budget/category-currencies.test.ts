import { Timestamp } from '@actual-app/crdt';

import { app as accountsApp } from '#server/accounts/app';
import * as db from '#server/db';
import { app as fxApp } from '#server/fx/app';
import * as sheet from '#server/sheet';
import { applyMessages } from '#server/sync';
import { undo } from '#server/undo';
// @ts-strict-ignore
import * as monthUtils from '#shared/months';

import {
  copyPreviousMonth,
  coverOverbudgeted,
  coverOverspending,
  resetIncomeCarryover,
  set3MonthAvg,
  setBudget,
  setCategoryCarryover,
  setZero,
  transferAvailable,
  transferCategory,
} from './actions';
import { app } from './app';
import {
  createAllBudgets,
  getLineSpending,
  getSumAmountsByMonth,
} from './base';

// A EUR budget whose Food category has a line for SEK spending
const jan = monthUtils.sheetForMonth('2017-01');
const feb = monthUtils.sheetForMonth('2017-02');
const mar = monthUtils.sheetForMonth('2017-03');
const food = 'food';
const sek = 'food-SEK';

async function setPreference(id: string, value: string) {
  await db.update('preferences', { id, value });
}

function value(sheetName: string, cell: string) {
  return sheet.getCellValue(sheetName, cell);
}

// Envelope budgets show the total budgeted as a negative amount
function envelopeBudgeted(sheetName: string) {
  return -value(sheetName, 'total-budgeted') || 0;
}

async function settle() {
  await sheet.waitOnSpreadsheet();
}

async function addRate(rate: number, date: string) {
  await fxApp.handlers['exchange-rate-create']({
    from_currency: 'SEK',
    to_currency: 'EUR',
    rate,
    date,
  });
  await settle();
}

async function spend(account: string, date: string, amount: number) {
  await db.insertTransaction({ date, amount, account, category: food });
  await settle();
}

async function setupBudget(
  budgetType: 'envelope' | 'tracking',
  startMonth = 201701,
) {
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = budgetType;
  db.runQuery("INSERT INTO preferences (id, value) VALUES ('budgetType', ?)", [
    budgetType,
  ]);

  await db.insertCategoryGroup({
    id: 'income',
    name: 'Income',
    is_income: 1,
  });
  await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
  await db.insertCategory({ id: food, name: 'Food', cat_group: 'expenses' });
  await db.insertCategory({
    id: 'salary',
    name: 'Salary',
    cat_group: 'income',
    is_income: 1,
  });

  await setPreference('flags.currency', 'true');
  await setPreference('flags.multiCurrency', 'true');
  await setPreference('defaultCurrencyCode', 'EUR');
  await db.insertAccount({ id: 'eur', name: 'Checking' });
  await db.insertAccount({ id: 'sek', name: 'Swedish card', currency: 'SEK' });
  await fxApp.handlers['exchange-rate-create']({
    from_currency: 'SEK',
    to_currency: 'EUR',
    rate: 0.09,
    date: '2017-01-01',
  });
  await db.insertCategoryCurrency({
    category: food,
    currency: 'SEK',
    start_month: startMonth,
  });

  await createAllBudgets();
  await settle();
}

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Currency lines (envelope)', () => {
  beforeEach(() => setupBudget('envelope'));

  it('counts spending in the currency of its line, unconverted', async () => {
    await spend('sek', '2017-01-10', -20000);
    await spend('eur', '2017-01-12', -4000);

    expect(value(jan, `sum-amount-${sek}`)).toBe(-20000);
    expect(value(jan, `sum-amount-${food}`)).toBe(-4000);
    expect(value(jan, `sum-amount-fx-${sek}`)).toBe(-1800);
    expect(value(jan, `sum-amount-total-${food}`)).toBe(-5800);
    expect(value(jan, 'group-sum-amount-expenses')).toBe(-5800);
    expect(value(jan, 'total-spent')).toBe(-5800);
  });

  it('takes the value of a budgeted amount from To Budget at the month rate', async () => {
    await db.insertTransaction({
      date: '2017-01-02',
      amount: 50000,
      account: 'eur',
      category: 'salary',
    });
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: food, month: '2017-01', amount: 10000 });
    await settle();

    expect(value(jan, `budget-${sek}`)).toBe(100000);
    expect(value(jan, `budget-fx-${sek}`)).toBe(9000);
    expect(value(jan, `budget-total-${food}`)).toBe(19000);
    expect(envelopeBudgeted(jan)).toBe(19000);
    expect(value(jan, 'to-budget')).toBe(31000);

    // The month's last rate counts, whatever its day
    await addRate(0.1, '2017-01-20');
    expect(value(jan, `budget-fx-${sek}`)).toBe(10000);
    expect(value(jan, 'to-budget')).toBe(30000);

    // A later month's rate leaves the month as it was
    await addRate(0.2, '2017-02-10');
    expect(value(jan, `budget-fx-${sek}`)).toBe(10000);
    await setBudget({ category: sek, month: '2017-02', amount: 100000 });
    await settle();
    expect(value(feb, `budget-fx-${sek}`)).toBe(20000);
  });

  it('keeps the balance of a line in its own currency', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await spend('sek', '2017-01-10', -20000);
    await addRate(0.5, '2017-02-01');

    expect(value(jan, `leftover-${sek}`)).toBe(80000);
    expect(value(feb, `leftover-${sek}`)).toBe(80000);
    expect(value(jan, `leftover-fx-${sek}`)).toBe(7200);
    expect(value(feb, `leftover-fx-${sek}`)).toBe(40000);
  });

  it('returns overspending to To Budget at the rate of its month', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 10000 });
    await spend('sek', '2017-01-10', -20000);
    await addRate(0.5, '2017-02-01');

    expect(value(jan, `leftover-${sek}`)).toBe(-10000);
    expect(value(feb, 'last-month-overspent')).toBe(-900);
    expect(value(feb, `leftover-${sek}`)).toBe(0);

    // Unless the balance rolls over
    await setCategoryCarryover({
      startMonth: '2017-01',
      category: sek,
      flag: true,
    });
    await settle();
    expect(value(feb, 'last-month-overspent')).toBe(0);
    expect(value(feb, `leftover-${sek}`)).toBe(-10000);
  });

  it('keeps the amounts of a line when the budget is opened again', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setCategoryCarryover({
      startMonth: '2017-01',
      category: sek,
      flag: true,
    });
    await settle();

    sheet.unloadSpreadsheet();
    await sheet.loadSpreadsheet(db);
    sheet.get().meta().budgetType = 'envelope';
    await createAllBudgets();
    await settle();

    expect(value(jan, `budget-${sek}`)).toBe(100000);
    expect(value(jan, `carryover-${sek}`)).toBe(true);
    expect(envelopeBudgeted(jan)).toBe(9000);
  });

  it('adds up the same spending with every query', async () => {
    await spend('sek', '2017-01-10', -20000);
    await spend('sek', '2017-02-10', -1000);
    await spend('eur', '2017-01-12', -4000);
    const { start } = monthUtils.bounds('2017-01');
    const { end } = monthUtils.bounds('2017-02');

    const sums = getSumAmountsByMonth(start, end);
    for (const month of ['2017-01', '2017-02']) {
      const bounds = monthUtils.bounds(month);
      const dbMonth = month.replace('-', '');
      for (const id of [food, sek]) {
        expect(sums.get(`${dbMonth}-${id}`) ?? 0).toBe(
          getLineSpending(id, bounds.start, bounds.end),
        );
      }
    }
  });

  it('leaves currency lines out while multiple currencies are off', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await spend('sek', '2017-01-10', -20000);

    await setPreference('flags.multiCurrency', 'false');
    await settle();
    expect(value(jan, `sum-amount-${sek}`)).toBe(0);
    expect(value(jan, `sum-amount-${food}`)).toBe(-20000);
    expect(envelopeBudgeted(jan)).toBe(0);

    await setPreference('flags.multiCurrency', 'true');
    await settle();
    expect(value(jan, `sum-amount-${sek}`)).toBe(-20000);
    expect(value(jan, `sum-amount-${food}`)).toBe(0);
    expect(envelopeBudgeted(jan)).toBe(9000);
  });
});

describe('Income in currency lines (envelope)', () => {
  beforeEach(async () => {
    await setupBudget('envelope');
    await db.insertCategoryCurrency({
      category: 'salary',
      currency: 'SEK',
      start_month: 201701,
    });
    await settle();
  });

  it('counts income in the currency of its line', async () => {
    await db.insertTransaction({
      date: '2017-01-05',
      amount: 100000,
      account: 'sek',
      category: 'salary',
    });
    await settle();

    expect(value(jan, 'sum-amount-salary-SEK')).toBe(100000);
    expect(value(jan, 'sum-amount-salary')).toBe(0);
    expect(value(jan, 'sum-amount-total-salary')).toBe(9000);
    expect(value(jan, 'total-income')).toBe(9000);
    expect(value(jan, 'to-budget')).toBe(9000);

    // Holding its income for next month, like a category's
    await setCategoryCarryover({
      startMonth: '2017-01',
      category: 'salary-SEK',
      flag: true,
    });
    await settle();
    expect(value(jan, 'buffered-auto')).toBe(9000);
    expect(value(jan, 'to-budget')).toBe(0);
    expect(value(feb, 'from-last-month')).toBe(9000);

    // Resetting the held income of the month releases it too
    await resetIncomeCarryover({ month: '2017-01' });
    await settle();
    expect(value(jan, 'buffered-auto')).toBe(0);
    expect(value(jan, 'to-budget')).toBe(9000);
  });
});

describe('Currency lines added later (envelope)', () => {
  beforeEach(() => setupBudget('envelope', 201702));

  it('counts spending in the category before the first month of a line', async () => {
    await spend('sek', '2017-01-10', -20000);
    await spend('sek', '2017-02-10', -20000);

    expect(value(jan, `sum-amount-${food}`)).toBe(-1800);
    expect(value(jan, `sum-amount-${sek}`)).toBe(0);
    expect(value(feb, `sum-amount-${food}`)).toBe(0);
    expect(value(feb, `sum-amount-${sek}`)).toBe(-20000);
  });

  it('moves spending when a line is added or removed', async () => {
    await db.deleteCategoryCurrency({ id: sek });
    await settle();
    await spend('sek', '2017-03-10', -20000);
    expect(value(mar, `sum-amount-${food}`)).toBe(-1800);
    expect(value(mar, 'total-spent')).toBe(-1800);

    await db.insertCategoryCurrency({
      category: food,
      currency: 'SEK',
      start_month: 201703,
    });
    await settle();
    expect(value(mar, `sum-amount-${food}`)).toBe(0);
    expect(value(mar, `sum-amount-${sek}`)).toBe(-20000);
    expect(value(mar, `sum-amount-total-${food}`)).toBe(-1800);
    expect(value(mar, 'total-spent')).toBe(-1800);

    await setBudget({ category: sek, month: '2017-03', amount: 100000 });
    await settle();
    expect(envelopeBudgeted(mar)).toBe(9000);

    await db.deleteCategoryCurrency({ id: sek });
    await settle();
    expect(value(mar, `sum-amount-${food}`)).toBe(-1800);
    expect(envelopeBudgeted(mar)).toBe(0);
    expect(value(mar, 'total-spent')).toBe(-1800);
  });
});

describe('Currency lines (tracking)', () => {
  beforeEach(() => setupBudget('tracking'));

  it('adds the value of a line to the group and budget totals', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: food, month: '2017-01', amount: 10000 });
    await spend('sek', '2017-01-10', -20000);

    expect(value(jan, `leftover-${sek}`)).toBe(80000);
    expect(value(jan, 'group-budget-expenses')).toBe(19000);
    expect(value(jan, 'total-budgeted')).toBe(19000);
    expect(value(jan, 'total-spent')).toBe(-1800);
    expect(value(jan, `leftover-total-${food}`)).toBe(17200);
  });

  it('budgets income in the currency of its line', async () => {
    await db.insertCategoryCurrency({
      category: 'salary',
      currency: 'SEK',
      start_month: 201701,
    });
    await settle();
    await setBudget({
      category: 'salary-SEK',
      month: '2017-01',
      amount: 100000,
    });
    await db.insertTransaction({
      date: '2017-01-05',
      amount: 80000,
      account: 'sek',
      category: 'salary',
    });
    await settle();

    expect(value(jan, 'leftover-salary-SEK')).toBe(20000);
    expect(value(jan, 'total-budget-income')).toBe(9000);
    expect(value(jan, 'total-income')).toBe(7200);
  });

  it('leaves the lines of hidden categories out of the group totals', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await settle();
    expect(value(jan, 'group-budget-expenses')).toBe(9000);

    await db.updateCategory({
      id: food,
      name: 'Food',
      cat_group: 'expenses',
      is_income: 0,
      hidden: 1,
    });
    await settle();
    expect(value(jan, 'group-budget-expenses')).toBe(0);
  });
});

// Chooses the currencies budgeted on their own, as `currency-own-lines`
// stores them, e.g. '*:0' for every currency in every month
async function setOwnLines(value: string) {
  await setPreference('currency-own-lines', value);
  await settle();
}

async function spendIn(
  category: string,
  account: string,
  date: string,
  amount: number,
) {
  const id = await db.insertTransaction({ date, amount, account, category });
  await settle();
  return id;
}

async function getLines() {
  return (await app.handlers['category-currencies-get']()).map(line => ({
    id: line.id,
    start_month: line.start_month,
    automatic: line.automatic ?? false,
  }));
}

describe('Currencies budgeted on their own (envelope)', () => {
  beforeEach(async () => {
    await setupBudget('envelope');
    await db.insertCategory({
      id: 'travel',
      name: 'Travel',
      cat_group: 'expenses',
    });
    await db.insertCategory({
      id: 'gifts',
      name: 'Gifts',
      cat_group: 'expenses',
    });
    await settle();
  });

  it('gives spending in another currency a line of its own', async () => {
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    expect(value(jan, 'sum-amount-travel')).toBe(-1800);

    await setOwnLines('*:0');
    expect(value(jan, 'sum-amount-travel')).toBe(0);
    expect(value(jan, 'sum-amount-travel-SEK')).toBe(-20000);
    expect(value(jan, 'sum-amount-total-travel')).toBe(-1800);
    expect(value(jan, 'leftover-travel-SEK')).toBe(-20000);
    expect(value(jan, 'group-sum-amount-expenses')).toBe(-1800);
    expect(value(jan, 'total-spent')).toBe(-1800);
    expect(await getLines()).toContainEqual({
      id: 'travel-SEK',
      start_month: null,
      automatic: true,
    });

    await setOwnLines('');
    expect(value(jan, 'sum-amount-travel')).toBe(-1800);
    expect(value(jan, 'total-spent')).toBe(-1800);
    expect((await getLines()).map(line => line.id)).not.toContain('travel-SEK');
  });

  it('starts automatic lines in the chosen month', async () => {
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await spendIn('travel', 'sek', '2017-02-10', -20000);
    await setOwnLines('*:201702');

    expect(value(jan, 'sum-amount-travel')).toBe(-1800);
    expect(value(jan, 'sum-amount-travel-SEK')).toBe(0);
    expect(value(feb, 'sum-amount-travel')).toBe(0);
    expect(value(feb, 'sum-amount-travel-SEK')).toBe(-20000);
    expect(await getLines()).toContainEqual({
      id: 'travel-SEK',
      start_month: '2017-02',
      automatic: true,
    });
  });

  it('adds and removes automatic lines with their spending', async () => {
    await setOwnLines('*:0');
    expect((await getLines()).map(line => line.id)).not.toContain('travel-SEK');

    const id = await spendIn('travel', 'sek', '2017-01-10', -20000);
    expect(value(jan, 'sum-amount-travel-SEK')).toBe(-20000);
    expect(value(jan, 'total-spent')).toBe(-1800);

    await db.deleteTransaction({ id });
    await settle();
    expect((await getLines()).map(line => line.id)).not.toContain('travel-SEK');
    expect(value(jan, 'sum-amount-total-travel')).toBe(0);
    expect(value(jan, 'total-spent')).toBe(0);
  });

  it('stores an automatic line once it is budgeted, and keeps it when its currency no longer is', async () => {
    await setOwnLines('*:0');
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await spendIn('gifts', 'sek', '2017-01-12', -10000);
    await setBudget({
      category: 'travel-SEK',
      month: '2017-01',
      amount: 30000,
    });
    await settle();

    expect(
      await db.first('SELECT * FROM category_currencies WHERE id = ?', [
        'travel-SEK',
      ]),
    ).toMatchObject({
      category: 'travel',
      currency: 'SEK',
      start_month: 0,
    });
    expect(value(jan, 'leftover-travel-SEK')).toBe(10000);
    expect(envelopeBudgeted(jan)).toBe(2700);

    await setOwnLines('');
    expect(await getLines()).toContainEqual({
      id: 'travel-SEK',
      start_month: null,
      automatic: false,
    });
    expect(value(jan, 'leftover-travel-SEK')).toBe(10000);
    expect(envelopeBudgeted(jan)).toBe(2700);
    // The line nobody budgeted goes away with its cells
    expect(value(jan, 'sum-amount-gifts')).toBe(-900);
    expect(value(jan, 'sum-amount-total-travel')).toBe(-1800);
    expect(value(jan, 'total-spent')).toBe(-2700);
  });

  it('finds the earlier spending a new line would move', async () => {
    const earlier = app.handlers['category-currency-earlier-spending'];
    // Food's SEK spending is on its line already
    await spend('sek', '2017-01-08', -20000);
    expect(await earlier({ month: '2017-02' })).toEqual([]);

    await spendIn('travel', 'sek', '2017-01-10', -20000);
    expect(await earlier({ month: '2017-02' })).toEqual(['SEK']);
    expect(await earlier({ month: '2017-01' })).toEqual([]);
  });

  it('lists the spending a category converts from other currencies', async () => {
    const converted = app.handlers['category-currency-converted-spending'];
    // Food's SEK spending is on its line, so nothing is converted there
    await spend('sek', '2017-01-08', -20000);
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await spendIn('travel', 'sek', '2017-01-11', -5000);
    await spendIn('travel', 'eur', '2017-01-12', -3000);

    expect(await converted({ month: '2017-01' })).toEqual([
      { category: 'travel', account: 'sek', currency: 'SEK', amount: -25000 },
    ]);
    expect(await converted({ month: '2017-02' })).toEqual([]);

    await setOwnLines('*:0');
    expect(await converted({ month: '2017-01' })).toEqual([]);
  });

  it('adds a line for every month without a first month', async () => {
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await app.handlers['category-currency-add']({
      category: 'travel',
      currency: 'SEK',
    });
    await settle();

    expect(await getLines()).toContainEqual({
      id: 'travel-SEK',
      start_month: null,
      automatic: false,
    });
    expect(value(jan, 'sum-amount-travel-SEK')).toBe(-20000);
    expect(value(jan, 'sum-amount-travel')).toBe(0);
  });

  it('keeps the first month of a stored line, unless earlier spending moves into lines', async () => {
    await db.update('category_currencies', { id: sek, start_month: 201702 });
    await settle();
    await spend('sek', '2017-01-10', -20000);
    expect(value(jan, `sum-amount-${food}`)).toBe(-1800);

    // Choosing the currency adds lines where there are none
    await setOwnLines('*:0');
    expect(value(jan, `sum-amount-${food}`)).toBe(-1800);
    expect(value(jan, `sum-amount-${sek}`)).toBe(0);

    await app.handlers['currency-own-lines-save']({
      value: '*:0',
      moveEarlier: ['SEK'],
    });
    await settle();
    expect(value(jan, `sum-amount-${food}`)).toBe(0);
    expect(value(jan, `sum-amount-${sek}`)).toBe(-20000);
    await setBudget({ category: sek, month: '2017-01', amount: 30000 });
    await settle();
    expect(value(jan, `budget-${sek}`)).toBe(30000);
  });

  it('budgets only the chosen currencies on their own', async () => {
    await db.insertAccount({ id: 'usd', name: 'US card', currency: 'USD' });
    await fxApp.handlers['exchange-rate-create']({
      from_currency: 'USD',
      to_currency: 'EUR',
      rate: 0.9,
      date: '2017-01-01',
    });
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await spendIn('travel', 'usd', '2017-01-11', -1000);
    await setOwnLines('USD:0');

    expect(value(jan, 'sum-amount-travel-USD')).toBe(-1000);
    expect(value(jan, 'sum-amount-travel')).toBe(-1800);
    expect(value(jan, 'sum-amount-total-travel')).toBe(-2700);
    let ids = (await getLines()).map(line => line.id);
    expect(ids).toContain('travel-USD');
    expect(ids).not.toContain('travel-SEK');
    expect(
      await app.handlers['category-currency-converted-spending']({
        month: '2017-01',
      }),
    ).toEqual([
      { category: 'travel', account: 'sek', currency: 'SEK', amount: -20000 },
    ]);

    // Every other currency too, from February on
    await spendIn('travel', 'sek', '2017-02-10', -20000);
    await setOwnLines('USD:0,*:201702');
    expect(value(jan, 'sum-amount-travel')).toBe(-1800);
    expect(value(feb, 'sum-amount-travel')).toBe(0);
    expect(value(feb, 'sum-amount-travel-SEK')).toBe(-20000);
    ids = (await getLines()).map(line => line.id);
    expect(ids).toContain('travel-SEK');
  });

  it('gives every category lines, also one that removed its line before', async () => {
    await spend('sek', '2017-01-10', -20000);
    await spendIn('travel', 'sek', '2017-01-11', -10000);
    // Food's SEK line removed, and a row an earlier version left for a
    // removed Travel line
    await app.handlers['category-currency-remove']({ id: sek });
    await db.insert('category_currencies', {
      id: 'travel-SEK',
      category: 'travel',
      currency: 'SEK',
      start_month: null,
      tombstone: 0,
    });
    await settle();
    expect(value(jan, `sum-amount-${food}`)).toBe(-1800);
    expect(value(jan, 'sum-amount-travel')).toBe(-900);

    await setOwnLines('*:0');
    expect(value(jan, `sum-amount-${sek}`)).toBe(-20000);
    expect(value(jan, `sum-amount-${food}`)).toBe(0);
    expect(value(jan, 'sum-amount-travel-SEK')).toBe(-10000);
    expect(value(jan, 'sum-amount-travel')).toBe(0);
    expect((await getLines()).map(line => line.id)).toEqual(
      expect.arrayContaining([sek, 'travel-SEK']),
    );
  });

  it('moves the budgets of lines whose currency is no longer chosen into their categories', async () => {
    await setOwnLines('*:0');
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await setBudget({
      category: 'travel-SEK',
      month: '2017-01',
      amount: 30000,
    });
    await setBudget({ category: 'travel', month: '2017-01', amount: 1000 });
    await settle();
    const toBudget = value(jan, 'to-budget');

    await app.handlers['currency-own-lines-save']({
      value: '',
      dropCurrencies: ['SEK'],
    });
    await settle();
    expect(await getLines()).toEqual([]);
    expect(value(jan, 'budget-travel')).toBe(1000 + 2700);
    expect(value(jan, 'sum-amount-travel')).toBe(-1800);
    expect(value(jan, 'to-budget')).toBe(toBudget);

    // One undo brings the lines and their budgets back
    await undo();
    await settle();
    expect(value(jan, 'budget-travel')).toBe(1000);
    expect(value(jan, 'budget-travel-SEK')).toBe(30000);
    expect((await getLines()).map(line => line.id)).toContain('travel-SEK');

    // Dropped lines aren't removed: choosing the currency again brings them
    // back where there is spending
    await app.handlers['currency-own-lines-save']({
      value: '',
      dropCurrencies: ['SEK'],
    });
    await setOwnLines('*:0');
    expect((await getLines()).map(line => line.id)).toContain('travel-SEK');
  });

  it('keeps the lines of a currency no longer chosen unless asked', async () => {
    await setOwnLines('*:0');
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await setBudget({
      category: 'travel-SEK',
      month: '2017-01',
      amount: 30000,
    });
    await settle();

    await app.handlers['currency-own-lines-save']({ value: '' });
    await settle();
    expect((await getLines()).map(line => line.id)).toEqual([
      sek,
      'travel-SEK',
    ]);
    expect(value(jan, 'budget-travel-SEK')).toBe(30000);
  });

  it('gives income in another currency a line of its own too', async () => {
    await spendIn('salary', 'sek', '2017-01-05', 80000);
    await setOwnLines('*:0');
    expect(value(jan, 'sum-amount-salary-SEK')).toBe(80000);
    expect(value(jan, 'sum-amount-salary')).toBe(0);
    expect(
      await app.handlers['category-currency-converted-spending']({
        month: '2017-01',
      }),
    ).toEqual([]);
  });

  it('budgets a line from an earlier month than its currency', async () => {
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await spendIn('travel', 'sek', '2017-02-10', -20000);
    await setOwnLines('*:201702');
    const add = app.handlers['category-currency-add'];
    await expect(
      add({ category: 'travel', currency: 'SEK', startMonth: '2017-02' }),
    ).rejects.toThrow();

    await add({ category: 'travel', currency: 'SEK', startMonth: '2017-01' });
    await settle();
    expect(await getLines()).toContainEqual({
      id: 'travel-SEK',
      start_month: '2017-01',
      automatic: false,
    });
    expect(value(jan, 'sum-amount-travel')).toBe(0);
    expect(value(jan, 'sum-amount-travel-SEK')).toBe(-20000);
    expect(value(feb, 'sum-amount-travel-SEK')).toBe(-20000);
  });
});

describe('Currencies budgeted on their own (tracking)', () => {
  beforeEach(async () => {
    await setupBudget('tracking');
    await db.insertCategory({
      id: 'travel',
      name: 'Travel',
      cat_group: 'expenses',
    });
    await settle();
  });

  it('adds automatic lines to the group and budget totals', async () => {
    await setOwnLines('*:0');
    await spendIn('travel', 'sek', '2017-01-10', -20000);
    await setBudget({
      category: 'travel-SEK',
      month: '2017-01',
      amount: 30000,
    });
    await settle();

    expect(value(jan, 'leftover-travel-SEK')).toBe(10000);
    expect(value(jan, 'group-budget-expenses')).toBe(2700);
    expect(value(jan, 'total-spent')).toBe(-1800);
  });
});

describe('Currency line actions (envelope)', () => {
  beforeEach(() => setupBudget('envelope'));

  function budget(sheetName: string, id: string) {
    return value(sheetName, `budget-${id}`);
  }

  async function getNote(month: string) {
    const row = await db.first<{ note: string }>(
      'SELECT note FROM notes WHERE id = ?',
      [`budget-${month}`],
    );
    return row?.note;
  }

  it('adds a currency other than the default to any category', async () => {
    const add = app.handlers['category-currency-add'];
    await expect(
      add({ category: food, currency: 'EUR', startMonth: '2017-01' }),
    ).rejects.toThrow();
    await expect(
      add({ category: food, currency: 'SEK', startMonth: '2017-01' }),
    ).rejects.toThrow();
    await expect(
      add({ category: food, currency: 'XYZ', startMonth: '2017-01' }),
    ).rejects.toThrow();

    expect(
      await add({ category: food, currency: 'USD', startMonth: '2017-02' }),
    ).toBe('food-USD');
    expect(
      await add({ category: 'salary', currency: 'SEK', startMonth: '2017-01' }),
    ).toBe('salary-SEK');
    expect(await app.handlers['category-currencies-get']()).toEqual([
      { id: sek, category: food, currency: 'SEK', start_month: '2017-01' },
      {
        id: 'food-USD',
        category: food,
        currency: 'USD',
        start_month: '2017-02',
      },
      {
        id: 'salary-SEK',
        category: 'salary',
        currency: 'SEK',
        start_month: '2017-01',
      },
    ]);
  });

  it('keeps one line when two devices add the same currency', async () => {
    await spend('sek', '2017-01-10', -20000);
    await spend('sek', '2017-02-10', -20000);

    // Another device added SEK to Food as well, later, from February on
    const millis = Date.now() + 60000;
    const fields = {
      category: food,
      currency: 'SEK',
      start_month: 201702,
      tombstone: 0,
    };
    await applyMessages(
      Object.entries(fields).map(([column, fieldValue], counter) => ({
        dataset: 'category_currencies',
        row: sek,
        column,
        value: fieldValue,
        timestamp: new Timestamp(millis, counter, '0123456789abcdef'),
      })),
    );
    await settle();

    expect(await app.handlers['category-currencies-get']()).toEqual([
      { id: sek, category: food, currency: 'SEK', start_month: '2017-02' },
    ]);
    // Each purchase counts once, in the line from its first month on
    expect(value(jan, `sum-amount-${food}`)).toBe(-1800);
    expect(value(jan, `sum-amount-${sek}`)).toBe(0);
    expect(value(feb, `sum-amount-${sek}`)).toBe(-20000);
    expect(value(feb, `sum-amount-total-${food}`)).toBe(-1800);
  });

  it('budgets a line from its first month on', async () => {
    await db.update('category_currencies', { id: sek, start_month: 201702 });
    await settle();
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: sek, month: '2017-02', amount: 100000 });
    await settle();
    expect(budget(jan, sek)).toBe(0);
    expect(budget(feb, sek)).toBe(100000);
  });

  it('moves the budget of a removed line into its category', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: food, month: '2017-01', amount: 10000 });
    await spend('sek', '2017-01-10', -20000);
    const toBudget = value(jan, 'to-budget');

    await app.handlers['category-currency-remove']({ id: sek });
    await settle();
    expect(budget(jan, food)).toBe(19000);
    expect(budget(jan, sek)).toBe(0);
    expect(value(jan, 'to-budget')).toBe(toBudget);
    expect(value(jan, `sum-amount-${food}`)).toBe(-1800);
    expect(await app.handlers['category-currencies-get']()).toEqual([]);

    // An amount another device budgeted on it meanwhile is left behind
    await db.update('zero_budgets', { id: `201701-${sek}`, amount: 5000 });
    await copyPreviousMonth({ month: '2017-02' });
    await settle();
    expect(budget(feb, food)).toBe(19000);
    expect(budget(feb, sek)).toBe(0);
  });

  it('moves the budgets of its lines when a category is deleted', async () => {
    await db.insertCategory({
      id: 'other',
      name: 'Other',
      cat_group: 'expenses',
    });
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: food, month: '2017-01', amount: 10000 });
    await spend('sek', '2017-01-10', -20000);
    expect(await app.handlers['must-category-transfer']({ id: food })).toBe(
      true,
    );

    await app.handlers['category-delete']({ id: food, transferId: 'other' });
    await settle();
    expect(budget(jan, 'other')).toBe(19000);
    expect(envelopeBudgeted(jan)).toBe(19000);
    expect(await app.handlers['category-currencies-get']()).toEqual([]);
    // Its spending counts once, in the category it moved to
    expect(value(jan, 'sum-amount-other')).toBe(-1800);
    expect(value(jan, 'total-spent')).toBe(-1800);
    expect(value(jan, 'group-leftover-expenses')).toBe(17200);
    expect(value(feb, 'last-month-overspent')).toBe(0);
  });

  it('converts money moved between currencies at the month rate', async () => {
    await db.insertCategory({
      id: 'rent',
      name: 'Rent',
      cat_group: 'expenses',
    });
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: 'rent', month: '2017-01', amount: 50000 });
    await settle();

    // The amount is in the currency of the line it comes from
    await transferCategory({
      month: '2017-01',
      amount: 10000,
      from: sek,
      to: 'rent',
      currencyCode: 'EUR',
    });
    await settle();
    expect(budget(jan, sek)).toBe(90000);
    expect(budget(jan, 'rent')).toBe(50900);
    expect(await getNote('2017-01')).toContain(
      'Reassigned SEK 100.00 from Food (SEK) → Rent (9.00)',
    );

    // To Budget is in the default currency
    await db.insertTransaction({
      date: '2017-01-02',
      amount: 100000,
      account: 'eur',
      category: 'salary',
    });
    await settle();
    await transferAvailable({ month: '2017-01', amount: 900, category: sek });
    await settle();
    expect(budget(jan, sek)).toBe(100000);
  });

  it('covers overspending in another currency', async () => {
    await db.insertCategory({
      id: 'rent',
      name: 'Rent',
      cat_group: 'expenses',
    });
    await setBudget({ category: 'rent', month: '2017-01', amount: 5000 });
    await spend('sek', '2017-01-10', -10000);
    expect(value(jan, `leftover-${sek}`)).toBe(-10000);

    await coverOverspending({
      month: '2017-01',
      to: sek,
      from: 'rent',
      currencyCode: 'EUR',
    });
    await settle();
    expect(value(jan, `leftover-${sek}`)).toBe(0);
    expect(budget(jan, 'rent')).toBe(4100);

    // A balance too small covers what it can
    await spend('sek', '2017-01-11', -100000);
    await coverOverspending({
      month: '2017-01',
      to: sek,
      from: 'rent',
      currencyCode: 'EUR',
    });
    await settle();
    expect(budget(jan, 'rent')).toBe(0);
    expect(value(jan, `leftover-${sek}`)).toBe(-54444);
  });

  it('covers To Budget from a line in another currency', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await settle();
    expect(value(jan, 'to-budget')).toBe(-9000);

    await coverOverbudgeted({
      month: '2017-01',
      category: sek,
      currencyCode: 'EUR',
    });
    await settle();
    expect(budget(jan, sek)).toBe(0);
    expect(value(jan, 'to-budget')).toBe(0);
  });

  it('copies, clears and averages the budgets of lines', async () => {
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await copyPreviousMonth({ month: '2017-02' });
    await settle();
    expect(budget(feb, sek)).toBe(100000);

    await setZero({ month: '2017-02' });
    await settle();
    expect(budget(feb, sek)).toBe(0);

    // Spending before its first month counts in the category, not in its
    // average
    await db.update('category_currencies', { id: sek, start_month: 201702 });
    await settle();
    global.currentMonth = '2017-05';
    try {
      await spend('sek', '2017-01-10', -90000);
      await spend('sek', '2017-02-10', -30000);
      await spend('sek', '2017-03-10', -60000);
      await spend('sek', '2017-04-10', -30000);
      await set3MonthAvg({ month: '2017-05' });
      await settle();
      expect(budget(monthUtils.sheetForMonth('2017-05'), sek)).toBe(40000);
    } finally {
      global.currentMonth = undefined;
    }
  });

  it('averages a category from its own first spending, not its lines', async () => {
    global.currentMonth = '2017-05';
    try {
      await spend('sek', '2017-01-10', -90000);
      await spend('eur', '2017-03-10', -3000);
      await spend('eur', '2017-04-10', -3000);
      await set3MonthAvg({ month: '2017-05' });
      await settle();
      expect(budget(monthUtils.sheetForMonth('2017-05'), food)).toBe(3000);
    } finally {
      global.currentMonth = undefined;
    }
  });
});

describe('Currencies of accounts', () => {
  beforeEach(() => setupBudget('envelope'));

  it('gives new accounts the default currency', async () => {
    const id = await accountsApp.handlers['account-create']({ name: 'Cash' });
    expect((await db.getAccount(id)).currency).toBe('EUR');
    const usd = await accountsApp.handlers['account-create']({
      name: 'US card',
      currency: 'USD',
    });
    expect((await db.getAccount(usd)).currency).toBe('USD');

    await setPreference('flags.multiCurrency', 'false');
    const later = await accountsApp.handlers['account-create']({
      name: 'Wallet',
    });
    expect((await db.getAccount(later)).currency).toBe(null);
  });

  it('gives accounts without a currency the default one', async () => {
    await db.insertAccount({ id: 'closed', name: 'Old', closed: 1 });
    expect(
      await accountsApp.handlers['accounts-pin-currency']({ currency: 'EUR' }),
    ).toEqual(expect.arrayContaining(['eur', 'closed']));
    expect((await db.getAccount('eur')).currency).toBe('EUR');
    expect((await db.getAccount('closed')).currency).toBe('EUR');
    expect((await db.getAccount('sek')).currency).toBe('SEK');
    expect(
      await accountsApp.handlers['accounts-pin-currency']({ currency: 'EUR' }),
    ).toEqual([]);
  });
});

describe('Changing the default currency', () => {
  async function getPreference(id: string) {
    const row = await db.first<{ value: string }>(
      'SELECT value FROM preferences WHERE id = ?',
      [id],
    );
    return row?.value;
  }

  // EUR budgets for Food in January and February and a SEK line budget,
  // spending in both currencies and an amount held for next month
  async function budgetAndSpend() {
    await setBudget({ category: food, month: '2017-01', amount: 10000 });
    await setBudget({ category: sek, month: '2017-01', amount: 100000 });
    await setBudget({ category: food, month: '2017-02', amount: 5000 });
    await spend('eur', '2017-01-10', -3000);
    await spend('sek', '2017-01-11', -20000);
    await db.insert('zero_budget_months', { id: '2017-01', buffered: 900 });
    await settle();
  }

  function expectNear(actual: unknown, expected: number) {
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(2);
  }

  describe('envelope', () => {
    beforeEach(() => setupBudget('envelope'));

    it('converts the budgets of a currency not budgeted on its own', async () => {
      await budgetAndSpend();
      const toBudget = value(jan, 'to-budget') as number;

      await app.handlers['currency-default-change']({
        currency: 'SEK',
        format: { numberFormat: 'space-comma' },
      });
      await settle();

      // The account that followed the default stays in EUR
      expect((await db.getAccount('eur')).currency).toBe('EUR');
      expect((await db.getAccount('sek')).currency).toBe('SEK');
      // No lines: EUR budgets become SEK budgets at each month's rate, the
      // SEK line becomes Food's own, and EUR spending is converted
      expect(await app.handlers['category-currencies-get']()).toEqual([]);
      expectNear(value(jan, `budget-${food}`), 10000 / 0.09 + 100000);
      expectNear(value(feb, `budget-${food}`), 5000 / 0.09);
      expectNear(value(jan, `sum-amount-${food}`), -20000 - 3000 / 0.09);
      expect(value(jan, 'buffered')).toBe(10000);
      // Each month keeps its value
      expectNear(value(jan, 'to-budget'), toBudget / 0.09);
      expect(await getPreference('defaultCurrencyCode')).toBe('SEK');
      expect(await getPreference('numberFormat')).toBe('space-comma');
      expect(await getPreference('currency-own-lines')).toBe('');
      expect(
        await app.handlers['category-currency-converted-spending']({
          month: '2017-01',
        }),
      ).toEqual([
        { category: food, account: 'eur', currency: 'EUR', amount: -3000 },
      ]);

      // One undo brings everything back
      await undo();
      await settle();
      expect((await db.getAccount('eur')).currency).toBe(null);
      expect(await app.handlers['category-currencies-get']()).toEqual([
        { id: sek, category: food, currency: 'SEK', start_month: '2017-01' },
      ]);
      expect(value(jan, `budget-${food}`)).toBe(10000);
      expect(value(jan, `budget-${sek}`)).toBe(100000);
      expect(value(feb, `budget-${food}`)).toBe(5000);
      expect(value(jan, 'buffered')).toBe(900);
      expect(value(jan, 'to-budget')).toBe(toBudget);
      expect(await getPreference('defaultCurrencyCode')).toBe('EUR');
    });

    it('keeps the budgets of a currency budgeted on its own on its lines', async () => {
      await setOwnLines('*:0');
      await budgetAndSpend();
      const toBudget = value(jan, 'to-budget') as number;

      await app.handlers['currency-default-change']({ currency: 'SEK' });
      await settle();

      // EUR budgets move to a EUR line, the SEK line becomes Food's own,
      // and nothing is converted
      expect(await app.handlers['category-currencies-get']()).toEqual([
        { id: 'food-EUR', category: food, currency: 'EUR', start_month: null },
      ]);
      expect(value(jan, 'budget-food-EUR')).toBe(10000);
      expect(value(feb, 'budget-food-EUR')).toBe(5000);
      expect(value(jan, `budget-${food}`)).toBe(100000);
      expect(value(feb, `budget-${food}`)).toBe(0);
      expect(value(jan, 'sum-amount-food-EUR')).toBe(-3000);
      expect(value(jan, `sum-amount-${food}`)).toBe(-20000);
      expect(value(jan, 'buffered')).toBe(10000);
      expectNear(value(jan, 'to-budget'), toBudget / 0.09);
      expect(await getPreference('currency-own-lines')).toBe('*:0');
    });

    it('keeps them on lines only from the month the currency is budgeted on its own', async () => {
      // Every currency from February: January stays as it was budgeted
      await setOwnLines('*:201702');
      await budgetAndSpend();
      const toBudget = value(jan, 'to-budget') as number;

      await app.handlers['currency-default-change']({ currency: 'SEK' });
      await settle();

      expect(await app.handlers['category-currencies-get']()).toEqual([
        {
          id: 'food-EUR',
          category: food,
          currency: 'EUR',
          start_month: '2017-02',
        },
      ]);
      // January: EUR converted into Food, like any currency before February
      expectNear(value(jan, `budget-${food}`), 10000 / 0.09 + 100000);
      expect(value(jan, 'budget-food-EUR')).toBe(0);
      expectNear(value(jan, `sum-amount-${food}`), -20000 - 3000 / 0.09);
      // February on: EUR budgets on the EUR line
      expect(value(feb, 'budget-food-EUR')).toBe(5000);
      expect(value(feb, `budget-${food}`)).toBe(0);
      expectNear(value(jan, 'to-budget'), toBudget / 0.09);
      // EUR follows the choice like every other currency
      expect(await getPreference('currency-own-lines')).toBe('*:201702');
    });

    it('lets the default be set for the first time', async () => {
      await setPreference('defaultCurrencyCode', '');
      await settle();
      await app.handlers['currency-default-change']({ currency: 'EUR' });
      await settle();
      expect((await db.getAccount('eur')).currency).toBe('EUR');
      expect(await getPreference('defaultCurrencyCode')).toBe('EUR');
      expect(await app.handlers['category-currencies-get']()).toEqual([
        { id: sek, category: food, currency: 'SEK', start_month: '2017-01' },
      ]);
    });
  });

  describe('tracking', () => {
    beforeEach(() => setupBudget('tracking'));

    it('converts the budgets of both budget types', async () => {
      await setBudget({ category: food, month: '2017-01', amount: 10000 });
      await setBudget({ category: 'salary', month: '2017-01', amount: 50000 });
      await settle();

      await app.handlers['currency-default-change']({ currency: 'SEK' });
      await settle();
      expectNear(value(jan, `budget-${food}`), 10000 / 0.09);
      expectNear(value(jan, 'budget-salary'), 50000 / 0.09);
    });
  });
});
