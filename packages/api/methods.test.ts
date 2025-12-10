import * as fs from 'fs/promises';
import * as path from 'path';

import { type RuleEntity } from 'loot-core/types/models';

import * as api from './index';

const budgetName = 'test-budget';

global.IS_TESTING = true;

beforeEach(async () => {
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

  // api: getBudgets
  test('getBudgets', async () => {
    const budgets = await api.getBudgets();
    expect(budgets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'test-budget',
          name: 'Default Test Db',
        }),
      ]),
    );
  });

  // apis: getCategoryGroups, createCategoryGroup, updateCategoryGroup, deleteCategoryGroup
  test('CategoryGroups: successfully update category groups', async () => {
    const month = '2023-10';
    global.currentMonth = month;

    // get existing category groups
    const groups = await api.getCategoryGroups();
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hidden: false,
          id: 'fc3825fd-b982-4b72-b768-5b30844cf832',
          is_income: false,
          name: 'Usual Expenses',
        }),
        expect.objectContaining({
          hidden: false,
          id: 'a137772f-cf2f-4089-9432-822d2ddc1466',
          is_income: false,
          name: 'Investments and Savings',
        }),
        expect.objectContaining({
          hidden: false,
          id: '2E1F5BDB-209B-43F9-AF2C-3CE28E380C00',
          is_income: true,
          name: 'Income',
        }),
      ]),
    );

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

  //apis: createAccount, getAccounts, updateAccount, closeAccount, deleteAccount, reopenAccount, getAccountBalance
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

    expect(await api.getAccountBalance(accountId1)).toEqual(1000);
    expect(await api.getAccountBalance(accountId2)).toEqual(0);

    await api.updateAccount(accountId1, { offbudget: false });
    await api.closeAccount(accountId1, accountId2);
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

  // apis: getRules, getPayeeRules, createRule, updateRule, deleteRule
  test('Rules: successfully update rules', async () => {
    await api.createPayee({ name: 'test-payee' });
    await api.createPayee({ name: 'test-payee2' });

    // create our test rules
    const rule = await api.createRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: 'test-payee',
        },
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
        },
      ],
    });
    const rule2 = await api.createRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: 'test-payee2',
        },
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
        },
      ],
    });

    // get existing rules
    const rules = await api.getRules();
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              op: 'set',
              type: 'id',
              value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
            }),
          ]),
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'payee',
              op: 'is',
              type: 'id',
              value: 'test-payee2',
            }),
          ]),
          conditionsOp: 'and',
          id: rule2.id,
          stage: 'pre',
        }),
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              op: 'set',
              type: 'id',
              value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
            }),
          ]),
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'payee',
              op: 'is',
              type: 'id',
              value: 'test-payee',
            }),
          ]),
          conditionsOp: 'and',
          id: rule.id,
          stage: 'pre',
        }),
      ]),
    );

    // get by payee
    expect(await api.getPayeeRules('test-payee')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              op: 'set',
              type: 'id',
              value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
            }),
          ]),
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'payee',
              op: 'is',
              type: 'id',
              value: 'test-payee',
            }),
          ]),
          conditionsOp: 'and',
          id: rule.id,
          stage: 'pre',
        }),
      ]),
    );

    expect(await api.getPayeeRules('test-payee2')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              op: 'set',
              type: 'id',
              value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
            }),
          ]),
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'payee',
              op: 'is',
              type: 'id',
              value: 'test-payee2',
            }),
          ]),
          conditionsOp: 'and',
          id: rule2.id,
          stage: 'pre',
        }),
      ]),
    );

    // update one rule
    const updatedRule = {
      ...rule,
      stage: 'post',
      conditionsOp: 'or',
    } satisfies RuleEntity;
    expect(await api.updateRule(updatedRule)).toEqual(updatedRule);

    expect(await api.getRules()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              op: 'set',
              type: 'id',
              value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
            }),
          ]),
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'payee',
              op: 'is',
              type: 'id',
              value: 'test-payee',
            }),
          ]),
          conditionsOp: 'or',
          id: rule.id,
          stage: 'post',
        }),
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({
              field: 'category',
              op: 'set',
              type: 'id',
              value: 'fc3825fd-b982-4b72-b768-5b30844cf832',
            }),
          ]),
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'payee',
              op: 'is',
              type: 'id',
              value: 'test-payee2',
            }),
          ]),
          conditionsOp: 'and',
          id: rule2.id,
          stage: 'pre',
        }),
      ]),
    );

    // delete rules
    await api.deleteRule(rules[1].id);
    expect(await api.getRules()).toHaveLength(1);

    await api.deleteRule(rules[0].id);
    expect(await api.getRules()).toHaveLength(0);
  });

  // apis: addTransactions, getTransactions, importTransactions, updateTransaction, deleteTransaction
  test('Transactions: successfully update transactions', async () => {
    const accountId = await api.createAccount({ name: 'test-account' }, 0);

    let newTransaction = [
      {
        account: accountId,
        date: '2023-11-03',
        imported_id: '11',
        amount: 100,
        notes: 'notes',
      },
      {
        account: accountId,
        date: '2023-11-03',
        imported_id: '12',
        amount: 100,
        notes: '',
      },
    ];

    const addResult = await api.addTransactions(accountId, newTransaction, {
      learnCategories: true,
      runTransfers: true,
    });
    expect(addResult).toBe('ok');

    expect(await api.getAccountBalance(accountId)).toEqual(200);
    expect(
      await api.getAccountBalance(accountId, new Date(2023, 10, 2)),
    ).toEqual(0);

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
      {
        account: accountId,
        date: '2023-12-03',
        imported_id: '11',
        amount: 100,
        notes: 'notes',
      },
      {
        account: accountId,
        date: '2023-12-03',
        imported_id: '12',
        amount: 100,
        notes: 'notes',
      },
      {
        account: accountId,
        date: '2023-12-03',
        imported_id: '22',
        amount: 200,
        notes: '',
      },
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
      expect.arrayContaining([
        expect.objectContaining({ imported_id: '22', amount: 200 }),
      ]),
    );
    expect(transactions).toHaveLength(1);

    // confirm imported transactions update perfomed
    transactions = await api.getTransactions(
      accountId,
      '2023-11-01',
      '2023-11-30',
    );
    expect(transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ notes: 'notes', amount: 100 }),
      ]),
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

  test('Transactions: import notes are preserved when importing', async () => {
    const accountId = await api.createAccount({ name: 'test-account' }, 0);

    // Test with notes
    const transactionsWithNotes = [
      {
        date: '2023-11-03',
        imported_id: '11',
        amount: 100,
        notes: 'test note',
      },
    ];

    const addResultWithNotes = await api.addTransactions(
      accountId,
      transactionsWithNotes,
      {
        learnCategories: true,
        runTransfers: true,
      },
    );
    expect(addResultWithNotes).toBe('ok');

    let transactions = await api.getTransactions(
      accountId,
      '2023-11-01',
      '2023-11-30',
    );
    expect(transactions[0].notes).toBe('test note');

    // Clear transactions
    await api.deleteTransaction(transactions[0].id);

    // Test without notes
    const transactionsWithoutNotes = [
      { date: '2023-11-03', imported_id: '11', amount: 100 },
    ];

    const addResultWithoutNotes = await api.addTransactions(
      accountId,
      transactionsWithoutNotes,
      {
        learnCategories: true,
        runTransfers: true,
      },
    );
    expect(addResultWithoutNotes).toBe('ok');

    transactions = await api.getTransactions(
      accountId,
      '2023-11-01',
      '2023-11-30',
    );
    expect(transactions[0].notes).toBeNull();
  });
});

//apis: createSchedule, getSchedules, updateSchedule, deleteSchedule
test('Schedules: successfully complete schedules operations', async () => {
  await api.loadBudget(budgetName);
  //test a schedule with a recuring configuration
  const ScheduleId1 = await api.createSchedule({
    name: 'test-schedule 1',
    posts_transaction: true,
    //    amount: -5000,
    amountOp: 'is',
    date: {
      frequency: 'monthly',
      interval: 1,
      start: '2025-06-13',
      patterns: [],
      skipWeekend: false,
      weekendSolveMode: 'after',
      endMode: 'never',
    },
  });
  //test the creation of non recurring schedule
  const ScheduleId2 = await api.createSchedule({
    name: 'test-schedule 2',
    posts_transaction: false,
    amount: 4000,
    amountOp: 'is',
    date: '2025-06-13',
  });
  let schedules = await api.getSchedules();

  // Schedules successfully created
  expect(schedules).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: 'test-schedule 1',
        posts_transaction: true,
        //       amount: -5000,
        amountOp: 'is',
        date: {
          frequency: 'monthly',
          interval: 1,
          start: '2025-06-13',
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
        },
      }),
      expect.objectContaining({
        name: 'test-schedule 2',
        posts_transaction: false,
        amount: 4000,
        amountOp: 'is',
        date: '2025-06-13',
      }),
    ]),
  );
  //check getIDByName works on schedules
  expect(await api.getIDByName('schedules', 'test-schedule 1')).toEqual(
    ScheduleId1,
  );
  expect(await api.getIDByName('schedules', 'test-schedule 2')).toEqual(
    ScheduleId2,
  );

  //check getIDByName works on accounts
  const schedAccountId1 = await api.createAccount(
    { name: 'sched-test-account1', offbudget: true },
    1000,
  );

  expect(await api.getIDByName('accounts', 'sched-test-account1')).toEqual(
    schedAccountId1,
  );

  //check getIDByName works on payees
  const schedPayeeId1 = await api.createPayee({ name: 'sched-test-payee1' });

  expect(await api.getIDByName('payees', 'sched-test-payee1')).toEqual(
    schedPayeeId1,
  );
  await api.updateSchedule(ScheduleId1, {
    amount: -10000,
    account: schedAccountId1,
  });
  await api.deleteSchedule(ScheduleId2);

  // schedules successfully updated, and one of them deleted
  await api.updateSchedule(ScheduleId1, {
    amount: -10000,
    account: schedAccountId1,
    payee: schedPayeeId1,
  });
  await api.deleteSchedule(ScheduleId2);

  schedules = await api.getSchedules();
  expect(schedules).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: ScheduleId1,
        posts_transaction: true,
        amount: -10000,
        account: schedAccountId1,
        payee: schedPayeeId1,
        amountOp: 'is',
        date: {
          frequency: 'monthly',
          interval: 1,
          start: '2025-06-13',
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
        },
      }),
      expect.not.objectContaining({ id: ScheduleId2 }),
    ]),
  );
});
