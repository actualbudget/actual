import { expectSnapshotWithDiffer } from '../mocks/util';
import * as monthUtils from '../shared/months';

import * as budgetActions from './budget/actions';
import * as budget from './budget/base';
import { getClock, deserializeClock } from './crdt';
import * as db from './db';
import {
  runHandler,
  runMutator,
  disableGlobalMutations,
  enableGlobalMutations
} from './mutators';
import * as prefs from './prefs';

jest.mock('./post');
const connection = require('../platform/server/connection');
const fs = require('../platform/server/fs');

const backend = require('./main');
const { post } = require('./post');
const handlers = backend.handlers;
const sheet = require('./sheet');

beforeEach(async () => {
  await global.emptyDatabase()();
  disableGlobalMutations();
});

afterEach(async () => {
  await runHandler(handlers['close-budget']);
  connection.resetEvents();
  enableGlobalMutations();
});

async function createTestBudget(name) {
  let templatePath = fs.join(__dirname, '/../mocks/files', name);
  let budgetPath = fs.join(__dirname, '/../mocks/files/budgets/test-budget');
  fs._setDocumentDir(fs.join(budgetPath, '..'));

  await fs.mkdir(budgetPath);
  await fs.copyFile(
    fs.join(templatePath, 'metadata.json'),
    fs.join(budgetPath, 'metadata.json')
  );
  await fs.copyFile(
    fs.join(templatePath, 'db.sqlite'),
    fs.join(budgetPath, 'db.sqlite')
  );
}

describe('Budgets', () => {
  afterEach(async () => {
    fs._setDocumentDir(null);
    let budgetPath = fs.join(__dirname, '/../mocks/files/budgets/test-budget');

    if (await fs.exists(budgetPath)) {
      await fs.removeDirRecursively(budgetPath);
    }
  });

  test('budget is successfully loaded', async () => {
    await createTestBudget('default-budget-template');

    // Grab the clock to compare later
    await db.openDatabase('test-budget');
    let row = await db.first('SELECT * FROM messages_clock');

    let { error } = await runHandler(handlers['load-budget'], {
      id: 'test-budget'
    });
    expect(error).toBe(undefined);

    // Make sure the prefs were loaded
    expect(prefs.getPrefs().id).toBe('test-budget');

    // Make sure the clock has been loaded
    expect(getClock()).toEqual(deserializeClock(row.clock));
  });

  test('budget detects out of sync migrations', async () => {
    await createTestBudget('default-budget-template');

    await db.openDatabase('test-budget');
    await db.runQuery('INSERT INTO __migrations__ (id) VALUES (1000)');

    const spy = jest.spyOn(console, 'warn').mockImplementation();

    let { error } = await runHandler(handlers['load-budget'], {
      id: 'test-budget'
    });
    // There should be an error and the budget should be unloaded
    expect(error).toBe('out-of-sync-migrations');
    expect(db.getDatabase()).toBe(null);
    expect(prefs.getPrefs()).toBe(null);

    spy.mockRestore();
  });
});

describe('Accounts', () => {
  test('create accounts with correct starting balance', async () => {
    prefs.loadPrefs();
    prefs.savePrefs({ clientId: 'client', groupId: 'group' });

    await runMutator(async () => {
      // An income category is required because the starting balance is
      // categorized to it. Create one now.
      await db.insertCategoryGroup({
        id: 'group1',
        name: 'income',
        is_income: 1
      });
      await db.insertCategory({
        name: 'income',
        cat_group: 'group1',
        is_income: 1
      });
    });

    // Get accounts from the server. This isn't the normal API call,
    // we know that the mock server just returns hardcoded accounts
    let { accounts } = await post('/plaid/accounts', {});

    // Create the accounts for the bank (bank is generally ignored in tests)
    await runHandler(handlers['accounts-connect'], {
      institution: { institution_id: 1, name: 'Jamesy Bank' },
      publicToken: 'foo',
      accountIds: accounts.map(acct => acct.account_id)
    });

    // Import transactions for all accounts
    await runHandler(handlers['accounts-sync'], {});

    // Go through each account and make sure the starting balance was
    // created correctly
    const res = await db.all('SELECT * FROM accounts');
    for (let account of res) {
      const sum = await db.first(
        'SELECT sum(amount) as sum FROM transactions WHERE acct = ? AND starting_balance_flag = 0',
        [account.id]
      );
      const starting = await db.first(
        'SELECT * FROM transactions WHERE acct = ? AND starting_balance_flag = 1',
        [account.id]
      );
      expect(account.balance_current - sum.sum).toBe(starting.amount);

      // Also ensure that the starting balance has the earliest date
      // possible
      const earliestTrans = await db.first(
        'SELECT p.name as payee_name FROM transactions t LEFT JOIN payees p ON p.id = t.description WHERE acct = ? ORDER BY date LIMIT 1',
        [account.id]
      );
      expect(earliestTrans.payee_name).toBe('Starting Balance');
    }
  });

  test('Transfers are properly updated', async () => {
    await runMutator(async () => {
      await db.insertAccount({ id: 'one', name: 'one' });
      await db.insertAccount({ id: 'two', name: 'two' });
      await db.insertAccount({ id: 'three', name: 'three' });
      await db.insertPayee({
        id: 'transfer-one',
        name: '',
        transfer_acct: 'one'
      });
      await db.insertPayee({
        id: 'transfer-two',
        name: '',
        transfer_acct: 'two'
      });
      await db.insertPayee({
        id: 'transfer-three',
        name: '',
        transfer_acct: 'three'
      });
    });

    const id = 'test-transfer';
    await runHandler(handlers['transaction-add'], {
      id,
      account: 'one',
      amount: 5000,
      payee: 'transfer-two',
      date: '2017-01-01'
    });
    let differ = expectSnapshotWithDiffer(
      await db.all('SELECT * FROM transactions')
    );

    let transaction = await db.getTransaction(id);
    await runHandler(handlers['transaction-update'], {
      ...(await db.getTransaction(id)),
      payee: 'transfer-three',
      date: '2017-01-03'
    });
    differ.expectToMatchDiff(await db.all('SELECT * FROM transactions'));

    transaction = await db.getTransaction(id);
    await runHandler(handlers['transaction-delete'], transaction);
    differ.expectToMatchDiff(await db.all('SELECT * FROM transactions'));
  });
});

describe('Budget', () => {
  test('new budgets should be created', async () => {
    const spreadsheet = await sheet.loadSpreadsheet(db);

    await runMutator(async () => {
      await db.insertCategoryGroup({
        id: 'incomeGroup',
        name: 'incomeGroup',
        is_income: 1
      });
      await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
      await db.insertCategory({ name: 'foo', cat_group: 'group1' });
      await db.insertCategory({ name: 'bar', cat_group: 'group1' });
    });

    let bounds = await runHandler(handlers['get-budget-bounds']);
    expect(bounds.start).toBe('2016-10');
    expect(bounds.end).toBe('2018-01');
    expect(spreadsheet.meta().createdMonths).toMatchSnapshot();

    // Add a transaction (which needs an account) earlier then the
    // current earliest budget to test if it creates the necessary
    // budgets for the earlier months
    await db.runQuery("INSERT INTO accounts (id, name) VALUES ('one', 'boa')");
    await runHandler(handlers['transaction-add'], {
      date: '2016-05-06',
      amount: 50,
      account: 'one'
    });

    // Fast-forward in time to a future month and make sure it creates
    // budgets for the months in the future
    monthUtils.currentMonth = () => '2017-02';

    bounds = await runHandler(handlers['get-budget-bounds']);
    expect(bounds.start).toBe('2016-02');
    expect(bounds.end).toBe('2018-02');
    expect(spreadsheet.meta().createdMonths).toMatchSnapshot();

    await new Promise(resolve => spreadsheet.onFinish(resolve));
  });

  test('budget updates when changing a category', async () => {
    const spreadsheet = await sheet.loadSpreadsheet(db);
    function captureChangedCells(func) {
      return new Promise(async resolve => {
        let changed = [];
        let remove = spreadsheet.addEventListener('change', ({ names }) => {
          changed = changed.concat(names);
        });
        await func();
        remove();
        spreadsheet.onFinish(() => {
          resolve(changed);
        });
      });
    }

    // Force the system to start tracking these months so budgets are
    // automatically updated when adding/deleting categories
    await db.runQuery('INSERT INTO created_budgets (month) VALUES (?)', [
      '2017-01'
    ]);
    await db.runQuery('INSERT INTO created_budgets (month) VALUES (?)', [
      '2017-02'
    ]);
    await db.runQuery('INSERT INTO created_budgets (month) VALUES (?)', [
      '2017-03'
    ]);
    await db.runQuery('INSERT INTO created_budgets (month) VALUES (?)', [
      '2017-04'
    ]);

    let categories;
    await captureChangedCells(async () => {
      await runMutator(() =>
        db.insertCategoryGroup({ id: 'group1', name: 'group1' })
      );
      categories = [
        await runHandler(handlers['category-create'], {
          name: 'foo',
          groupId: 'group1'
        }),
        await runHandler(handlers['category-create'], {
          name: 'bar',
          groupId: 'group1'
        }),
        await runHandler(handlers['category-create'], {
          name: 'baz',
          groupId: 'group1'
        }),
        await runHandler(handlers['category-create'], {
          name: 'biz',
          groupId: 'group1'
        })
      ];
    });

    await db.runQuery("INSERT INTO accounts (id, name) VALUES ('boa', 'boa')");
    let trans = {
      id: 'boa-transaction',
      date: '2017-02-06',
      amount: 5000,
      account: 'boa',
      category: categories[0]
    };
    // Test insertions
    let changed = await captureChangedCells(() =>
      runHandler(handlers['transaction-add'], trans)
    );
    expect(changed.sort()).toMatchSnapshot();
    // Test updates
    changed = await captureChangedCells(async () => {
      await runHandler(handlers['transaction-update'], {
        ...(await db.getTransaction(trans.id)),
        amount: 7000
      });
    });
    expect(changed.sort()).toMatchSnapshot();
    // Test deletions
    changed = await captureChangedCells(async () => {
      await runHandler(handlers['transaction-delete'], { id: trans.id });
    });
    expect(changed.sort()).toMatchSnapshot();
  });
});

describe('Categories', () => {
  test('can be deleted', async () => {
    await sheet.loadSpreadsheet(db);

    await runMutator(async () => {
      await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
      await db.insertCategory({ id: 'foo', name: 'foo', cat_group: 'group1' });
      await db.insertCategory({ id: 'bar', name: 'bar', cat_group: 'group1' });
    });

    let categories = await db.getCategories();
    expect(categories.length).toBe(2);
    expect(categories.find(cat => cat.name === 'foo')).not.toBeNull();
    expect(categories.find(cat => cat.name === 'bar')).not.toBeNull();
    await runHandler(handlers['category-delete'], { id: 'foo' });

    categories = await db.getCategories();
    expect(categories.length).toBe(1);
    expect(categories.find(cat => cat.name === 'bar')).not.toBeNull();
  });

  test('transfers properly when deleted', async () => {
    await sheet.loadSpreadsheet(db);

    let transId = await runMutator(async () => {
      await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
      await db.insertCategoryGroup({ id: 'group1b', name: 'group1b' });
      await db.insertCategoryGroup({
        id: 'group2',
        name: 'group2',
        is_income: 1
      });
      await db.insertCategory({ id: 'foo', name: 'foo', cat_group: 'group1' });
      await db.insertCategory({ id: 'bar', name: 'bar', cat_group: 'group1b' });
      await db.insertCategory({
        id: 'income1',
        name: 'income1',
        is_income: 1,
        cat_group: 'group2'
      });
      await db.insertCategory({
        id: 'income2',
        name: 'income2',
        is_income: 1,
        cat_group: 'group2'
      });

      return await db.insertTransaction({
        date: '2017-01-01',
        account: 'acct',
        amount: 4500,
        category: 'foo'
      });
    });

    await budget.createAllBudgets();

    // Set a budget value for the category `foo` of 1000
    let sheetName = monthUtils.sheetForMonth('2018-01');
    await budgetActions.setBudget({
      category: 'foo',
      month: '2018-01',
      amount: 1000
    });
    expect(sheet.getCellValue(sheetName, 'group-budget-group1')).toBe(1000);
    expect(sheet.getCellValue(sheetName, 'group-budget-group1b')).toBe(0);

    // Make sure the transaction has a category of `foo`
    let trans = await db.getTransaction(transId);
    expect(trans.category).toBe('foo');

    await runHandler(handlers['category-delete'], {
      id: 'foo',
      transferId: 'bar'
    });

    // Make sure the transaction has been updated
    trans = await db.getTransaction(transId);
    expect(trans.category).toBe('bar');

    // Make sure the budget value was transferred
    expect(sheet.getCellValue(sheetName, 'group-budget-group1')).toBe(0);
    expect(sheet.getCellValue(sheetName, 'group-budget-group1b')).toBe(1000);

    // Transfering an income category to an expense just doesn't make
    // sense. Make sure this doesn't do anything.
    let { error } = await runHandler(handlers['category-delete'], {
      id: 'income1',
      transferId: 'bar'
    });
    expect(error).toBe('category-type');

    let categories = await db.getCategories();
    expect(categories.find(cat => cat.id === 'income1')).toBeDefined();

    // Make sure you can delete income categories
    await runHandler(handlers['category-delete'], {
      id: 'income1',
      transferId: 'income2'
    });

    categories = await db.getCategories();
    expect(categories.find(cat => cat.id === 'income1')).not.toBeDefined();
  });
});
