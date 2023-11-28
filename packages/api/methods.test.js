import * as connection from '../loot-core/src/platform/server/connection';
import * as fs from '../loot-core/src/platform/server/fs';
import * as db from '../loot-core/src/server/db';
import * as actualApp from '../loot-core/src/server/main';
import {
  runHandler,
  runMutator,
  disableGlobalMutations,
  enableGlobalMutations,
} from '../loot-core/src/server/mutators';
import * as prefs from '../loot-core/src/server/prefs';

import * as injected from './injected';
import * as api from './methods';

let budgetName;
beforeAll(async () => {
  budgetName = 'test-budget';
});

beforeEach(async () => {
  await global.emptyDatabase()();
  disableGlobalMutations();

  // Inject the actual API
  injected.override(actualApp.lib.send);

  // we need real datetime if we are going to mix new timestamps with our mock data
  global.restoreDateNow();
});

afterEach(async () => {
  await runHandler(actualApp.handlers['close-budget']);
  connection.resetEvents();
  enableGlobalMutations();
  global.currentMonth = null;
  global.resetTime();

  fs._setDocumentDir(null);
  const budgetPath = fs.join(__dirname, '/mocks/budgets/', budgetName);

  if (await fs.exists(budgetPath)) {
    await fs.removeDirRecursively(budgetPath);
  }
});

async function createTestBudget(templateName, name) {
  const templatePath = fs.join(
    __dirname,
    '/../loot-core/src/mocks/files',
    templateName,
  );
  const budgetPath = fs.join(__dirname, '/mocks/budgets/', name);
  fs._setDocumentDir(fs.join(budgetPath, '..'));

  await fs.mkdir(budgetPath);
  await fs.copyFile(
    fs.join(templatePath, 'metadata.json'),
    fs.join(budgetPath, 'metadata.json'),
  );
  await fs.copyFile(
    fs.join(templatePath, 'db.sqlite'),
    fs.join(budgetPath, 'db.sqlite'),
  );
}

describe('API setup and teardown', () => {
  // apis: loadBudget, getBudgetMonths
  test('successfully loads budget', async () => {
    await createTestBudget('default-budget-template', budgetName);

    await expect(api.loadBudget(budgetName)).resolves.toBeUndefined();

    // Make sure the prefs were loaded
    expect(prefs.getPrefs().id).toBe(budgetName);

    await expect(api.getBudgetMonths()).resolves.toMatchSnapshot();
  });
});

describe('API CRUD operations', () => {
  beforeEach(async () => {
    // load test budget
    await createTestBudget('default-budget-template', budgetName);
    await runHandler(actualApp.handlers['load-budget'], { id: budgetName });
  });

  // apis: setBudgetAmount, setBudgetCarryover, getBudgetMonth
  test('Budgets: successfully update budgets', async () => {
    const month = '2023-10';
    global.currentMonth = month;

    // create some new categories to test with
    await runMutator(async () => {
      await db.insertCategoryGroup({ id: 'tests', name: 'tests' });
      await db.insertCategory({
        id: 'test-budget',
        name: 'test-budget',
        cat_group: 'tests',
      });
    });

    await api.setBudgetAmount(month, 'test-budget', 100);
    await api.setBudgetCarryover(month, 'test-budget', true);

    const budgetMonth = await api.getBudgetMonth(month);
    expect(budgetMonth.categoryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tests',
          categories: expect.arrayContaining([
            expect.objectContaining({
              id: 'test-budget',
              budgeted: 100,
              carryover: true,
            }),
          ]),
        }),
      ]),
    );
  });

  //apis: createAccount, getAccounts, updateAccount, closeAccount, deleteAccount, reopenAccount
  test('Accounts: successfully complete account operators', async () => {
    const accountId1 = await api.createAccount(
      { name: 'test-account1', offbudget: true },
      1000,
    );
    const accountId2 = await api.createAccount({ name: 'test-account2' }, 0);
    let accounts = await api.getAccounts();

    // accounts successfully created
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: accountId1,
          name: 'test-account1',
          offbudget: true,
        }),
        expect.objectContaining({ id: accountId2, name: 'test-account2' }),
      ]),
    );

    await api.updateAccount(accountId1, { offbudget: false });
    await api.closeAccount(accountId1, accountId2, null);
    await api.deleteAccount(accountId2);

    // accounts successfully updated, and one of them deleted
    accounts = await api.getAccounts();
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: accountId1,
          name: 'test-account1',
          closed: true,
          offbudget: false,
        }),
        expect.not.objectContaining({ id: accountId2 }),
      ]),
    );

    await api.reopenAccount(accountId1);

    // the non-deleted account is reopened
    accounts = await api.getAccounts();
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: accountId1,
          name: 'test-account1',
          closed: false,
        }),
      ]),
    );
  });
});
