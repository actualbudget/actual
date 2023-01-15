import { addTransactions } from '../server/accounts/sync';
import { runQuery as aqlQuery } from '../server/aql';
import * as budgetActions from '../server/budget/actions';
import * as budget from '../server/budget/base';
import * as db from '../server/db';
import { runHandler, runMutator } from '../server/mutators';
import * as prefs from '../server/prefs';
import * as sheet from '../server/sheet';
import { batchMessages, setSyncingMode } from '../server/sync';
import * as monthUtils from '../shared/months';
import q from '../shared/query';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length) % list.length];
}

function number(start, end) {
  return start + (end - start) * Math.random();
}

function integer(start, end) {
  return Math.round(number(start, end));
}

function findMin(items, field) {
  let item = items[0];
  for (let i = 0; i < items.length; i++) {
    if (items[i][field] < item[field]) {
      item = items[i];
    }
  }
  return item;
}

function getStartingBalanceCat(categories) {
  return categories.find(c => c.name === 'Starting Balances').id;
}

function extractCommonThings(payees, groups) {
  let incomePayee = payees.find(p => p.name === 'Deposit');
  let expensePayees = payees.filter(
    p => p.name !== 'Deposit' && p.name !== 'Starting Balance'
  );
  let expenseGroup = groups.find(g => g.is_income === 0);
  let incomeGroup = groups.find(g => g.is_income === 1);
  let categories = expenseGroup.categories.filter(
    c =>
      [
        'Food',
        'Restaurants',
        'Entertainment',
        'Clothing',
        'General',
        'Gift',
        'Medical'
      ].indexOf(c.name) !== -1
  );

  return {
    incomePayee,
    expensePayees: expensePayees.filter(p => !p.bill),
    incomeGroup,
    expenseCategories: categories,
    billCategories: groups.find(g => g.name === 'Bills').categories,
    billPayees: expensePayees.filter(p => p.bill)
  };
}

async function fillPrimaryChecking(handlers, account, payees, groups) {
  let {
    incomePayee,
    expensePayees,
    incomeGroup,
    expenseCategories,
    billCategories,
    billPayees
  } = extractCommonThings(payees, groups);
  let numTransactions = integer(100, 200);

  let transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee;
    if (Math.random() < 0.09) {
      payee = incomePayee;
    } else {
      payee = pickRandom(expensePayees);
    }

    let category;
    if (payee.name === 'Deposit') {
      category = incomeGroup.categories.find(c => c.name === 'Income');
    } else {
      category = pickRandom(expenseCategories);
    }

    let amount;
    if (payee.name === 'Deposit') {
      amount = integer(50000, 70000);
    } else {
      amount = integer(0, Math.random() < 0.05 ? -8000 : -700);
    }

    let transaction = {
      amount,
      payee: payee.id,
      account: account.id,
      date: monthUtils.subDays(monthUtils.currentDay(), Math.floor(i / 3)),
      category: category.id
    };
    transactions.push(transaction);

    if (Math.random() < 0.2) {
      let a = Math.round(transaction.amount / 3);
      let pick = () =>
        payee === incomePayee
          ? incomeGroup.categories.find(c => c.name === 'Income').id
          : pickRandom(expenseCategories).id;
      transaction.subtransactions = [
        { amount: a, category: pick() },
        { amount: a, category: pick() },
        {
          amount: transaction.amount - a * 2,
          category: pick()
        }
      ];
    }
  }

  let earliestMonth = monthUtils.monthFromDate(
    transactions[transactions.length - 1].date
  );
  let months = monthUtils.rangeInclusive(
    earliestMonth,
    monthUtils.currentMonth()
  );
  let currentDay = monthUtils.currentDay();
  for (let month of months) {
    let date = monthUtils.addDays(month, '12');
    if (monthUtils.isBefore(date, currentDay)) {
      transactions.push({
        amount: -10000,
        payee: billPayees.find(p => p.name.toLowerCase().includes('power')).id,
        account: account.id,
        date,
        category: billCategories.find(c => c.name === 'Power').id
      });
    }

    date = monthUtils.addDays(month, '18');
    if (monthUtils.isBefore(date, currentDay)) {
      transactions.push({
        amount: -9000,
        payee: billPayees.find(p => p.name.toLowerCase().includes('water')).id,
        account: account.id,
        date,
        category: billCategories.find(c => c.name === 'Water').id
      });
    }

    date = monthUtils.addDays(month, '2');
    if (monthUtils.isBefore(date, currentDay)) {
      transactions.push({
        amount: -120000,
        payee: billPayees.find(p => p.name.toLowerCase().includes('housy')).id,
        account: account.id,
        date,
        category: billCategories.find(c => c.name === 'Mortgage').id
      });
    }

    date = monthUtils.addDays(month, '20');
    if (monthUtils.isBefore(date, currentDay)) {
      transactions.push({
        amount: -6000,
        payee: billPayees.find(p => p.name.toLowerCase().includes('internet'))
          .id,
        account: account.id,
        date,
        category: billCategories.find(c => c.name === 'Internet').id
      });
    }

    date = monthUtils.addDays(month, '23');
    if (monthUtils.isBefore(date, currentDay)) {
      transactions.push({
        amount: -7500,
        payee: billPayees.find(p => p.name.toLowerCase().includes('t-mobile'))
          .id,
        account: account.id,
        date,
        category: billCategories.find(c => c.name === 'Cell').id
      });
    }
  }

  let earliestDate = null;
  transactions.forEach(t => {
    if (earliestDate == null || t.date < earliestDate) {
      earliestDate = t.date;
    }
  });

  transactions.unshift({
    amount: 100000,
    payee: payees.find(p => p.name === 'Starting Balance').id,
    account: account.id,
    date: earliestDate,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });

  return addTransactions(account.id, transactions);
}

async function fillChecking(handlers, account, payees, groups) {
  let { incomePayee, expensePayees, incomeGroup, expenseCategories } =
    extractCommonThings(payees, groups);
  let numTransactions = integer(20, 40);

  let transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee;
    if (Math.random() < 0.04) {
      payee = incomePayee;
    } else {
      payee = pickRandom(expensePayees);
    }

    let category;
    if (payee.name === 'Deposit') {
      category = incomeGroup.categories.find(c => c.name === 'Income');
    } else {
      category = pickRandom(expenseCategories);
    }

    let amount =
      payee.name === 'Deposit' ? integer(50000, 70000) : integer(0, -10000);

    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: monthUtils.subDays(monthUtils.currentDay(), i * 2),
      category: category.id
    });
  }

  transactions.unshift({
    amount: integer(90000, 120000),
    payee: payees.find(p => p.name === 'Starting Balance').id,
    account: account.id,
    date: transactions[transactions.length - 1].date,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });

  await handlers['transactions-batch-update']({
    added: transactions,
    fastMode: true
  });
}

async function fillInvestment(handlers, account, payees, groups) {
  let { incomePayee, incomeGroup } = extractCommonThings(payees, groups);

  let numTransactions = integer(10, 30);

  let transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee = incomePayee;
    let category = incomeGroup.categories.find(c => c.name === 'Income');

    let amount = integer(10000, 20000);

    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: monthUtils.subDays(monthUtils.currentDay(), integer(10, 360)),
      category: category.id
    });
  }

  transactions.unshift({
    amount: integer(10000, 20000),
    payee: payees.find(p => p.name === 'Starting Balance').id,
    account: account.id,
    date: findMin(transactions, 'date').date,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });

  await handlers['transactions-batch-update']({
    added: transactions,
    fastMode: true
  });
}

async function fillSavings(handlers, account, payees, groups) {
  let { incomePayee, expensePayees, incomeGroup, expenseCategories } =
    extractCommonThings(payees, groups);

  let numTransactions = integer(15, 40);

  let transactions = [];
  for (let i = 0; i < numTransactions; i++) {
    let payee;
    if (Math.random() < 0.3) {
      payee = incomePayee;
    } else {
      payee = pickRandom(expensePayees);
    }
    let category =
      payee === incomePayee
        ? incomeGroup.categories.find(c => c.name === 'Income')
        : pickRandom(expenseCategories);
    let amount =
      payee === incomePayee ? integer(10000, 80000) : integer(-10000, -2000);

    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: monthUtils.subDays(monthUtils.currentDay(), i * 5),
      category: category.id
    });
  }

  transactions.unshift({
    amount: 30000,
    payee: payees.find(p => p.name === 'Starting Balance').id,
    account: account.id,
    date: transactions[transactions.length - 1].date,
    category: getStartingBalanceCat(incomeGroup.categories),
    starting_balance_flag: true
  });

  await handlers['transactions-batch-update']({
    added: transactions,
    fastMode: true
  });
}

async function fillMortgage(handlers, account, payees, groups) {
  let { incomePayee, incomeGroup } = extractCommonThings(payees, groups);

  let numTransactions = integer(7, 10);
  let amount = integer(100000, 200000);
  let category = incomeGroup.categories.find(c => c.name === 'Income');

  let transactions = [
    {
      amount: integer(-3000, -3500) * 100 * 100,
      payee: payees.find(p => p.name === 'Starting Balance').id,
      account: account.id,
      date:
        monthUtils.subMonths(monthUtils.currentDay(), numTransactions) + '-02',
      category: getStartingBalanceCat(incomeGroup.categories),
      starting_balance_flag: true
    }
  ];
  for (let i = 0; i < numTransactions; i++) {
    let payee = incomePayee;

    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: monthUtils.subMonths(monthUtils.currentDay(), i) + '-02',
      category: category.id,
      starting_balance_flag: true
    });
  }

  await handlers['transactions-batch-update']({
    added: transactions,
    fastMode: true
  });
}

async function fillOther(handlers, account, payees, groups) {
  let { incomePayee, incomeGroup } = extractCommonThings(payees, groups);

  let numTransactions = integer(3, 6);
  let category = incomeGroup.categories.find(c => c.name === 'Income');

  let transactions = [
    {
      amount: integer(3250, 3700) * 100 * 100,
      payee: payees.find(p => p.name === 'Starting Balance').id,
      account: account.id,
      date:
        monthUtils.subMonths(monthUtils.currentDay(), numTransactions) + '-02',
      category: getStartingBalanceCat(incomeGroup.categories),
      starting_balance_flag: true
    }
  ];
  for (let i = 0; i < numTransactions; i++) {
    let payee = incomePayee;
    let amount = integer(4, 9) * 100 * 100;

    transactions.push({
      amount,
      payee: payee.id,
      account: account.id,
      date: monthUtils.subMonths(monthUtils.currentDay(), i) + '-02',
      category: category.id
    });
  }

  await handlers['transactions-batch-update']({
    added: transactions,
    fastMode: true
  });
}

async function createBudget(accounts, payees, groups) {
  let primaryAccount = accounts.find(a => (a.name = 'Bank of America'));
  let earliestDate = (
    await db.first(
      `SELECT * FROM v_transactions t LEFT JOIN accounts a ON t.account = a.id
       WHERE a.offbudget = 0 AND t.is_child = 0 ORDER BY date ASC LIMIT 1`
    )
  ).date;
  let earliestPrimaryDate = (
    await db.first(
      `SELECT * FROM v_transactions t LEFT JOIN accounts a ON t.account = a.id
       WHERE a.id = ? AND a.offbudget = 0 AND t.is_child = 0 ORDER BY date ASC LIMIT 1`,
      [primaryAccount.id]
    )
  ).date;

  let start = monthUtils.monthFromDate(db.fromDateRepr(earliestDate));
  let end = monthUtils.currentMonth();
  let months = monthUtils.rangeInclusive(start, end);

  function category(name) {
    for (let group of groups) {
      let cat = group.categories.find(c => c.name === name);
      if (cat) {
        return cat;
      }
    }
  }

  function setBudget(month, category, amount) {
    return budgetActions.setBudget({ month, category: category.id, amount });
  }

  function setBudgetIfSpent(month, cat) {
    let spent = sheet.getCellValue(
      monthUtils.sheetForMonth(month),
      `sum-amount-${cat.id}`
    );

    if (spent < 0) {
      setBudget(month, cat, -spent);
    }
  }

  await runMutator(() =>
    batchMessages(async () => {
      for (let month of months) {
        if (
          month >=
          monthUtils.monthFromDate(db.fromDateRepr(earliestPrimaryDate))
        ) {
          setBudget(month, category('Food'), 40000);
          setBudget(month, category('Restaurants'), 30000);
          setBudget(month, category('Entertainment'), 10000);
          setBudget(month, category('Clothing'), 3000);
          setBudget(month, category('General'), 50000);
          setBudget(month, category('Gift'), 7500);
          setBudget(month, category('Medical'), 10000);

          setBudget(month, category('Cell'), 7500);
          setBudget(month, category('Internet'), 6000);
          setBudget(month, category('Mortgage'), 120000);
          setBudget(month, category('Water'), 9000);
          setBudget(month, category('Power'), 10000);
        } else {
          setBudgetIfSpent(month, category('Food'));
          setBudgetIfSpent(month, category('Restaurants'));
          setBudgetIfSpent(month, category('Entertainment'));
          setBudgetIfSpent(month, category('Clothing'));
          setBudgetIfSpent(month, category('General'));
          setBudgetIfSpent(month, category('Gift'));
          setBudgetIfSpent(month, category('Medical'));

          setBudgetIfSpent(month, category('Cell'));
          setBudgetIfSpent(month, category('Internet'));
          setBudgetIfSpent(month, category('Mortgage'));
          setBudgetIfSpent(month, category('Water'));
          setBudgetIfSpent(month, category('Power'));
        }
      }
    })
  );

  await sheet.waitOnSpreadsheet();

  await runMutator(() =>
    batchMessages(async () => {
      let prevSaved = 0;
      for (let month of months) {
        if (
          month >=
            monthUtils.monthFromDate(db.fromDateRepr(earliestPrimaryDate)) &&
          month <= monthUtils.currentMonth()
        ) {
          let sheetName = monthUtils.sheetForMonth(month);
          let toBudget = sheet.getCellValue(sheetName, 'to-budget');
          let available = toBudget - prevSaved;

          if (available - 403000 > 0) {
            setBudget(month, category('Savings'), available - 403000);
            budgetActions.setBuffer(month, 403000);

            prevSaved += available - 403000;
          } else if (available > 0) {
            budgetActions.setBuffer(month, available);
          }
        }
      }
    })
  );

  await sheet.waitOnSpreadsheet();

  let sheetName = monthUtils.sheetForMonth(monthUtils.currentMonth());
  let toBudget = sheet.getCellValue(sheetName, 'to-budget');
  if (toBudget < 0) {
    await addTransactions(primaryAccount.id, [
      {
        amount: -toBudget,
        category: category('Income').id,
        date: monthUtils.currentMonth() + '-01'
      }
    ]);
  }

  // let sheetName = monthUtils.sheetForMonth(monthUtils.currentMonth());
  // let toBudget = sheet.getCellValue(sheetName, 'to-budget');
  // setBudget(monthUtils.currentMonth(), category('Savings'), toBudget);

  await sheet.waitOnSpreadsheet();
}

export async function createTestBudget(handlers) {
  setSyncingMode('import');

  await db.execQuery('PRAGMA journal_mode = OFF');

  // Clear out the default categories. This is fine to do without
  // going through the sync system because we are in import mode and
  // these aren't tracked through messages anyway.
  await db.runQuery('DELETE FROM categories;');
  await db.runQuery('DELETE FROM category_groups');

  let accounts = [
    { name: 'Bank of America', type: 'checking' },
    { name: 'Ally Savings', type: 'savings' },
    { name: 'Capital One Checking', type: 'checking' },
    { name: 'HSBC', type: 'checking' },
    { name: 'Vanguard 401k', type: 'investment', offBudget: 1 },
    { name: 'Mortgage', type: 'mortgage', offBudget: 1 },
    { name: 'House Asset', type: 'other', offBudget: 1 },
    { name: 'Roth IRA', type: 'investment', offBudget: 1 }
  ];
  await runMutator(() =>
    batchMessages(async () => {
      for (let account of accounts) {
        account.id = await handlers['account-create'](account);
      }
    })
  );

  let payees = [
    { name: 'Starting Balance' },
    { name: 'Kroger' },
    { name: 'Publix' },
    { name: 'Home Depot' },
    { name: 'Movies' },
    { name: 'Online store' },
    { name: 'Deposit' },
    { name: 'Dominion Power', bill: true },
    { name: 'Extra Watery', bill: true },
    { name: 'Housy House', bill: true },
    { name: 'Fast Internet', bill: true },
    { name: 'T-mobile', bill: true }
  ];

  await runMutator(() =>
    batchMessages(async () => {
      for (let payee of payees) {
        payee.id = await handlers['payee-create']({ name: payee.name });
      }
    })
  );

  let categoryGroups = [
    {
      name: 'Usual Expenses',
      categories: [
        { name: 'Savings' },
        { name: 'Medical' },
        { name: 'Gift' },
        { name: 'General' },
        { name: 'Clothing' },
        { name: 'Entertainment' },
        { name: 'Restaurants' },
        { name: 'Food' }
      ]
    },
    {
      name: 'Bills',
      categories: [
        { name: 'Power' },
        { name: 'Water' },
        { name: 'Mortgage' },
        { name: 'Internet' },
        { name: 'Cell' }
      ]
    },
    {
      name: 'Income',
      is_income: true,
      categories: [
        { name: 'Income', is_income: true },
        { name: 'Misc', is_income: true },
        { name: 'Starting Balances', is_income: true }
      ]
    }
  ];

  await runMutator(async () => {
    for (let group of categoryGroups) {
      group.id = await handlers['category-group-create']({
        name: group.name,
        isIncome: group.is_income ? 1 : 0
      });

      for (let category of group.categories) {
        category.id = await handlers['category-create']({
          ...category,
          isIncome: category.is_income ? 1 : 0,
          groupId: group.id
        });
      }
    }
  });

  let allGroups = (await runHandler(handlers['get-categories'])).grouped;

  setSyncingMode('import');

  await runMutator(() =>
    batchMessages(async () => {
      for (let account of accounts) {
        switch (account.type) {
          case 'checking':
            if (account.name === 'Bank of America') {
              await fillPrimaryChecking(handlers, account, payees, allGroups);
            } else {
              await fillChecking(handlers, account, payees, allGroups);
            }
            break;
          case 'investment':
            await fillInvestment(handlers, account, payees, allGroups);
            break;
          case 'savings':
            await fillSavings(handlers, account, payees, allGroups);
            break;
          case 'mortgage':
            await fillMortgage(handlers, account, payees, allGroups);
            break;
          case 'other':
            if (account.name === 'House Asset') {
              await fillOther(handlers, account, payees, allGroups);
            } else {
              await fillChecking(handlers, account, payees, allGroups);
            }
            break;
          default:
        }
      }
    })
  );

  setSyncingMode('import');

  // This checks to see if the primary account is in the negative.
  // This might happen depending on the transactions added, but we
  // don't want to show that as it'd be weird. We modify the latest
  // deposit transaction to force it to be positive
  let primaryAccount = accounts.find(a => (a.name = 'Bank of America'));
  let { data: primaryBalance } = await aqlQuery(
    q('transactions')
      .filter({ account: primaryAccount.id })
      .calculate({ $sum: '$amount' })
      .serialize()
  );
  if (primaryBalance < 0) {
    let { data: results } = await aqlQuery(
      q('transactions')
        .filter({ account: primaryAccount.id, amount: { $gt: 0 } })
        .limit(1)
        .select(['id', 'amount'])
        .serialize()
    );
    let lastDeposit = results[0];

    await runHandler(handlers['transaction-update'], {
      ...lastDeposit,
      amount: lastDeposit.amount + -primaryBalance + integer(10000, 20000)
    });
  }

  // Bust the cache and reload the spreadsheet
  setSyncingMode('disabled');
  await prefs.savePrefs({ isCached: false });
  await sheet.reloadSpreadsheet(db);
  await budget.createAllBudgets();

  await sheet.waitOnSpreadsheet();

  // Create a budget
  await createBudget(accounts, payees, allGroups);
}
