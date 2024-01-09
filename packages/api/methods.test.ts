import * as fs from 'fs/promises';
import * as path from 'path';

import * as api from './index';

const budgetName = 'test-budget';

beforeEach(async () => {
  // we need real datetime if we are going to mix new timestamps with our mock data
  global.restoreDateNow();

  const budgetPath = path.join(__dirname, '/mocks/budgets/', budgetName);
  await fs.rm(budgetPath, { force: true, recursive: true });

  await createTestBudget('default-budget-template', budgetName);
  await api.init({
    dataDir: path.join(__dirname, '/mocks/budgets/'),
  });
});

afterEach(async () => {
  global.currentMonth = null;
  await api.shutdown();
});

async function createTestBudget(templateName: string, name: string) {
  const templatePath = path.join(
    __dirname,
    '/../loot-core/src/mocks/files',
    templateName,
  );
  const budgetPath = path.join(__dirname, '/mocks/budgets/', name);

  await fs.mkdir(budgetPath);
  await fs.copyFile(
    path.join(templatePath, 'metadata.json'),
    path.join(budgetPath, 'metadata.json'),
  );
  await fs.copyFile(
    path.join(templatePath, 'db.sqlite'),
    path.join(budgetPath, 'db.sqlite'),
  );
}

describe('API setup and teardown', () => {
  // apis: loadBudget, getBudgetMonths
  test('successfully loads budget', async () => {
    await expect(api.loadBudget(budgetName)).resolves.toBeUndefined();

    await expect(api.getBudgetMonths()).resolves.toMatchSnapshot();
  });
});

describe('API CRUD operations', () => {
  beforeEach(async () => {
    // load test budget
    await api.loadBudget(budgetName);
  });

  // apis: createCategoryGroup, updateCategoryGroup, deleteCategoryGroup
  test('CategoryGroups: successfully update category groups', async () => {
    const month = '2023-10';
    global.currentMonth = month;

    // create our test category group
    const mainGroupId = await api.createCategoryGroup({
      name: 'test-group',
    });

    let budgetMonth = await api.getBudgetMonth(month);
    expect(budgetMonth.categoryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: mainGroupId,
        }),
      ]),
    );

    // update group
    await api.updateCategoryGroup(mainGroupId, {
      name: 'update-tests',
    });

    budgetMonth = await api.getBudgetMonth(month);
    expect(budgetMonth.categoryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: mainGroupId,
        }),
      ]),
    );

    // delete group
    await api.deleteCategoryGroup(mainGroupId);

    budgetMonth = await api.getBudgetMonth(month);
    expect(budgetMonth.categoryGroups).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining({
          id: mainGroupId,
        }),
      ]),
    );
  });

  // apis: createCategory, getCategories, updateCategory, deleteCategory
  test('Categories: successfully update categories', async () => {
    const month = '2023-10';
    global.currentMonth = month;

    // create our test category group
    const mainGroupId = await api.createCategoryGroup({
      name: 'test-group',
    });
    const secondaryGroupId = await api.createCategoryGroup({
      name: 'test-secondary-group',
    });
    const categoryId = await api.createCategory({
      name: 'test-budget',
      group_id: mainGroupId,
    });
    const categoryIdHidden = await api.createCategory({
      name: 'test-budget-hidden',
      group_id: mainGroupId,
      hidden: true,
    });

    let categories = await api.getCategories();
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: categoryId,
          name: 'test-budget',
          hidden: false,
          group_id: mainGroupId,
        }),
        expect.objectContaining({
          id: categoryIdHidden,
          name: 'test-budget-hidden',
          hidden: true,
          group_id: mainGroupId,
        }),
      ]),
    );

    // update/move category
    await api.updateCategory(categoryId, {
      name: 'updated-budget',
      group_id: secondaryGroupId,
    });

    await api.updateCategory(categoryIdHidden, {
      name: 'updated-budget-hidden',
      group_id: secondaryGroupId,
      hidden: false,
    });

    categories = await api.getCategories();
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: categoryId,
          name: 'updated-budget',
          hidden: false,
          group_id: secondaryGroupId,
        }),
        expect.objectContaining({
          id: categoryIdHidden,
          name: 'updated-budget-hidden',
          hidden: false,
          group_id: secondaryGroupId,
        }),
      ]),
    );

    // delete categories
    await api.deleteCategory(categoryId);

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining({
          id: categoryId,
        }),
      ]),
    );
  });

  // apis: setBudgetAmount, setBudgetCarryover, getBudgetMonth
  test('Budgets: successfully update budgets', async () => {
    const month = '2023-10';
    global.currentMonth = month;

    // create some new categories to test with
    const groupId = await api.createCategoryGroup({
      name: 'tests',
    });
    const categoryId = await api.createCategory({
      name: 'test-budget',
      group_id: groupId,
    });

    await api.setBudgetAmount(month, categoryId, 100);
    await api.setBudgetCarryover(month, categoryId, true);

    const budgetMonth = await api.getBudgetMonth(month);
    expect(budgetMonth.categoryGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: groupId,
          categories: expect.arrayContaining([
            expect.objectContaining({
              id: categoryId,
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

  // apis: createPayee, getPayees, updatePayee, deletePayee
  test('Payees: successfully update payees', async () => {
    const payeeId1 = await api.createPayee({ name: 'test-payee1' });
    const payeeId2 = await api.createPayee({ name: 'test-payee2' });
    let payees = await api.getPayees();

    // payees successfully created
    expect(payees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: payeeId1,
          name: 'test-payee1',
        }),
        expect.objectContaining({
          id: payeeId2,
          name: 'test-payee2',
        }),
      ]),
    );

    await api.updatePayee(payeeId1, { name: 'test-updated-payee' });
    await api.deletePayee(payeeId2);

    // confirm update and delete were successful
    payees = await api.getPayees();
    expect(payees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: payeeId1,
          name: 'test-updated-payee',
        }),
        expect.not.objectContaining({
          name: 'test-payee1',
        }),
        expect.not.objectContaining({
          id: payeeId2,
        }),
      ]),
    );
  });

  // apis: addTransactions, getTransactions, importTransactions, updateTransaction, deleteTransaction
  test('Transactions: successfully update transactions', async () => {
    const accountId = await api.createAccount({ name: 'test-account' }, 0);

    let newTransaction = [
      { date: '2023-11-03', imported_id: '11', amount: 100 },
      { date: '2023-11-03', imported_id: '11', amount: 100 },
    ];

    const addResult = await api.addTransactions(accountId, newTransaction, {
      learnCategories: true,
      runTransfers: true,
    });
    expect(addResult).toBe('ok');

    // confirm added transactions exist
    let transactions = await api.getTransactions(
      accountId,
      '2023-11-01',
      '2023-11-30',
    );
    expect(transactions).toEqual(
      expect.arrayContaining(
        newTransaction.map(trans => expect.objectContaining(trans)),
      ),
    );
    expect(transactions).toHaveLength(2);

    newTransaction = [
      { date: '2023-12-03', imported_id: '11', amount: 100 },
      { date: '2023-12-03', imported_id: '22', amount: 200 },
    ];

    const reconciled = await api.importTransactions(accountId, newTransaction);

    // Expect it to reconcile and to have updated one of the previous transactions
    expect(reconciled.added).toHaveLength(1);
    expect(reconciled.updated).toHaveLength(1);

    // confirm imported transactions exist
    transactions = await api.getTransactions(
      accountId,
      '2023-12-01',
      '2023-12-31',
    );
    expect(transactions).toEqual(
      expect.arrayContaining(
        newTransaction.map(trans => expect.objectContaining(trans)),
      ),
    );
    expect(transactions).toHaveLength(2);

    const idToUpdate = reconciled.added[0];
    const idToDelete = reconciled.updated[0];
    await api.updateTransaction(idToUpdate, { amount: 500 });
    await api.deleteTransaction(idToDelete);

    // confirm updates and deletions work
    transactions = await api.getTransactions(
      accountId,
      '2023-12-01',
      '2023-12-31',
    );
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: idToUpdate, amount: 500 }),
        expect.not.objectContaining({ id: idToDelete }),
      ]),
    );
    expect(transactions).toHaveLength(1);
  });
});
