import { getClock } from '@actual-app/crdt';

import * as connection from '../platform/server/connection';
import {
  getDownloadError,
  getSyncError,
  getTestKeyError,
} from '../shared/errors';
import * as monthUtils from '../shared/months';
import q from '../shared/query';
import {
  ungroupTransactions,
  updateTransaction,
  deleteTransaction,
} from '../shared/transactions';
import { integerToAmount } from '../shared/util';
import { Handlers } from '../types/handlers';
import { ServerHandlers } from '../types/server-handlers';

import { addTransactions } from './accounts/sync';
import {
  accountModel,
  categoryModel,
  categoryGroupModel,
  payeeModel,
} from './api-models';
import { runQuery as aqlQuery } from './aql';
import * as cloudStorage from './cloud-storage';
import * as db from './db';
import { runMutator } from './mutators';
import * as prefs from './prefs';
import * as sheet from './sheet';
import { setSyncingMode, batchMessages } from './sync';

let IMPORT_MODE = false;

// This is duplicate from main.js...
function APIError(msg, meta?) {
  return { type: 'APIError', message: msg, meta };
}

// The API is different in two ways: we never want undo enabled, and
// we also need to notify the UI manually if stuff has changed (if
// they are connecting to an already running instance, the UI should
// update). The wrapper handles that.
function withMutation(handler) {
  return args => {
    return runMutator(
      async () => {
        let latestTimestamp = getClock().timestamp.toString();
        let result = await handler(args);

        let rows = await db.all(
          'SELECT DISTINCT dataset FROM messages_crdt WHERE timestamp > ?',
          [latestTimestamp],
        );

        // Only send the sync event if anybody else is connected
        if (connection.getNumClients() > 1) {
          connection.send('sync-event', {
            type: 'success',
            tables: rows.map(row => row.dataset),
          });
        }

        return result;
      },
      { undoDisabled: true },
    );
  };
}

let handlers = {} as unknown as Handlers;

async function validateMonth(month) {
  if (!month.match(/^\d{4}-\d{2}$/)) {
    throw APIError('Invalid month format, use YYYY-MM: ' + month);
  }

  if (!IMPORT_MODE) {
    let { start, end } = await handlers['get-budget-bounds']();
    let range = monthUtils.range(start, end);
    if (!range.includes(month)) {
      throw APIError('No budget exists for month: ' + month);
    }
  }
}

async function validateExpenseCategory(debug, id) {
  if (id == null) {
    throw APIError(`${debug}: category id is required`);
  }

  let row = await db.first('SELECT is_income FROM categories WHERE id = ?', [
    id,
  ]);

  if (!row) {
    throw APIError(`${debug}: category “${id}” does not exist`);
  }

  if (row.is_income !== 0) {
    throw APIError(`${debug}: category “${id}” is not an expense category`);
  }
}

function checkFileOpen() {
  if (!(prefs.getPrefs() || {}).id) {
    throw APIError('No budget file is open');
  }
}

let batchPromise = null;

handlers['api/batch-budget-start'] = async function () {
  if (batchPromise) {
    throw APIError('Cannot start a batch process: batch already started');
  }

  // If we are importing, all we need to do is start a raw database
  // transaction. Updating spreadsheet cells doesn't go through the
  // syncing layer in that case.
  if (IMPORT_MODE) {
    db.asyncTransaction(() => {
      return new Promise((resolve, reject) => {
        batchPromise = { resolve, reject };
      });
    });
  } else {
    batchMessages(() => {
      return new Promise((resolve, reject) => {
        batchPromise = { resolve, reject };
      });
    });
  }
};

handlers['api/batch-budget-end'] = async function () {
  if (!batchPromise) {
    throw APIError('Cannot end a batch process: no batch started');
  }

  batchPromise.resolve();
  batchPromise = null;
};

handlers['api/load-budget'] = async function ({ id }) {
  let { id: currentId } = prefs.getPrefs() || {};

  if (currentId !== id) {
    connection.send('start-load');
    let { error } = await handlers['load-budget']({ id });

    if (!error) {
      connection.send('finish-load');
    } else {
      connection.send('show-budgets');

      throw new Error(getSyncError(error, id));
    }
  }
};

handlers['api/download-budget'] = async function ({ syncId, password }) {
  let { id: currentId } = prefs.getPrefs() || {};
  if (currentId) {
    await handlers['close-budget']();
  }

  let localBudget = (await handlers['get-budgets']()).find(
    b => b.groupId === syncId,
  );
  if (localBudget) {
    await handlers['load-budget']({ id: localBudget.id });
    let result = await handlers['sync-budget']();
    if (result.error) {
      throw new Error(getSyncError(result.error, localBudget.id));
    }
  } else {
    let files = await handlers['get-remote-files']();
    if (!files) {
      throw new Error('Could not get remote files');
    }
    let file = files.find(f => f.groupId === syncId);
    if (!file) {
      throw new Error(
        `Budget “${syncId}” not found. Check the sync id of your budget in the Advanced section of the settings page.`,
      );
    }
    if (file.encryptKeyId && !password) {
      throw new Error(
        `File ${file.name} is encrypted. Please provide a password.`,
      );
    }
    if (password) {
      let result = await handlers['key-test']({
        fileId: file.fileId,
        password,
      });
      if (result.error) {
        throw new Error(getTestKeyError(result.error));
      }
    }

    let result = await handlers['download-budget']({ fileId: file.fileId });
    if (result.error) {
      throw new Error(getDownloadError(result.error));
    }
    await handlers['load-budget']({ id: result.id });
  }
};

handlers['api/sync'] = async function () {
  let { id } = prefs.getPrefs();
  let result = await handlers['sync-budget']();
  if (result.error) {
    throw new Error(getSyncError(result.error, id));
  }
};

handlers['api/start-import'] = async function ({ budgetName }) {
  // Notify UI to close budget
  await handlers['close-budget']();

  // Create the budget
  await handlers['create-budget']({ budgetName, avoidUpload: true });

  // Clear out the default expense categories
  await db.runQuery('DELETE FROM categories WHERE is_income = 0');
  await db.runQuery('DELETE FROM category_groups WHERE is_income = 0');

  // Turn syncing off
  setSyncingMode('import');

  connection.send('start-import');
  IMPORT_MODE = true;
};

handlers['api/finish-import'] = async function () {
  checkFileOpen();

  sheet.get().markCacheDirty();

  // We always need to fully reload the app. Importing doesn't touch
  // the spreadsheet, but we can't just recreate the spreadsheet
  // either; there is other internal state that isn't created
  let { id } = prefs.getPrefs();
  await handlers['close-budget']();
  await handlers['load-budget']({ id });

  await handlers['get-budget-bounds']();
  await sheet.waitOnSpreadsheet();

  await cloudStorage.upload().catch(err => {});

  connection.send('finish-import');
  IMPORT_MODE = false;
};

handlers['api/abort-import'] = async function () {
  if (IMPORT_MODE) {
    checkFileOpen();

    let { id } = prefs.getPrefs();

    await handlers['close-budget']();
    await handlers['delete-budget']({ id });
    connection.send('show-budgets');
  }

  IMPORT_MODE = false;
};

handlers['api/query'] = async function ({ query }) {
  checkFileOpen();
  return aqlQuery(query);
};

handlers['api/budget-months'] = async function () {
  checkFileOpen();
  let { start, end } = await handlers['get-budget-bounds']();
  return monthUtils.range(start, end);
};

handlers['api/budget-month'] = async function ({ month }) {
  checkFileOpen();
  await validateMonth(month);

  let groups = await db.getCategoriesGrouped();
  let sheetName = monthUtils.sheetForMonth(month);

  function value(name) {
    let v = sheet.get().getCellValue(sheetName, name);
    return v === '' ? 0 : v;
  }

  // This is duplicated from main.js because the return format is
  // different (for now)
  return {
    month,
    incomeAvailable: value('available-funds'),
    lastMonthOverspent: value('last-month-overspent'),
    forNextMonth: value('buffered'),
    totalBudgeted: value('total-budgeted'),
    toBudget: value('to-budget'),

    fromLastMonth: value('from-last-month'),
    totalIncome: value('total-income'),
    totalSpent: value('total-spent'),
    totalBalance: value('total-leftover'),

    categoryGroups: groups.map(group => {
      if (group.is_income) {
        return {
          ...categoryGroupModel.toExternal(group),
          received: value('total-income'),

          categories: group.categories.map(cat => ({
            ...categoryModel.toExternal(cat),
            received: value(`sum-amount-${cat.id}`),
          })),
        };
      }

      return {
        ...categoryGroupModel.toExternal(group),
        budgeted: value(`group-budget-${group.id}`),
        spent: value(`group-sum-amount-${group.id}`),
        balance: value(`group-leftover-${group.id}`),

        categories: group.categories.map(cat => ({
          ...categoryModel.toExternal(cat),
          budgeted: value(`budget-${cat.id}`),
          spent: value(`sum-amount-${cat.id}`),
          balance: value(`leftover-${cat.id}`),
          carryover: value(`carryover-${cat.id}`),
        })),
      };
    }),
  };
};

handlers['api/budget-set-amount'] = withMutation(async function ({
  month,
  categoryId,
  amount,
}) {
  checkFileOpen();
  return handlers['budget/budget-amount']({
    month,
    category: categoryId,
    amount,
  });
});

handlers['api/budget-set-carryover'] = withMutation(async function ({
  month,
  categoryId,
  flag,
}) {
  checkFileOpen();
  await validateMonth(month);
  await validateExpenseCategory('budget-set-carryover', categoryId);
  return handlers['budget/set-carryover']({
    startMonth: month,
    category: categoryId,
    flag,
  });
});

handlers['api/transactions-export'] = async function ({
  transactions,
  categoryGroups,
  payees,
}) {
  checkFileOpen();
  return handlers['transactions-export']({
    transactions,
    categoryGroups,
    payees,
  });
};

handlers['api/transactions-import'] = withMutation(async function ({
  accountId,
  transactions,
}) {
  checkFileOpen();
  return handlers['transactions-import']({ accountId, transactions });
});

handlers['api/transactions-add'] = withMutation(async function ({
  accountId,
  transactions,
}) {
  checkFileOpen();
  await addTransactions(accountId, transactions, { runTransfers: false });
  return 'ok';
});

handlers['api/transactions-get'] = async function ({
  accountId,
  startDate,
  endDate,
}) {
  checkFileOpen();
  let { data } = await aqlQuery(
    q('transactions')
      .filter({
        $and: [
          accountId && { account: accountId },
          startDate && { date: { $gte: startDate } },
          endDate && { date: { $lte: endDate } },
        ].filter(Boolean),
      })
      .select('*')
      .options({ splits: 'grouped' }),
  );
  return data;
};

handlers['api/transactions-filter'] = async function ({ text, accountId }) {
  throw new Error('`filterTransactions` is deprecated, use `runQuery` instead');
};

handlers['api/transaction-update'] = withMutation(async function ({
  id,
  fields,
}) {
  checkFileOpen();
  let { data } = await aqlQuery(
    q('transactions').filter({ id }).select('*').options({ splits: 'grouped' }),
  );
  let transactions = ungroupTransactions(data);

  if (transactions.length === 0) {
    return [];
  }

  let { diff } = updateTransaction(transactions, fields);
  return handlers['transactions-batch-update'](diff);
});

handlers['api/transaction-delete'] = withMutation(async function ({ id }) {
  checkFileOpen();
  let { data } = await aqlQuery(
    q('transactions').filter({ id }).select('*').options({ splits: 'grouped' }),
  );
  let transactions = ungroupTransactions(data);

  if (transactions.length === 0) {
    return [];
  }

  let { diff } = deleteTransaction(transactions, id);
  return handlers['transactions-batch-update'](diff);
});

handlers['api/accounts-get'] = async function () {
  checkFileOpen();
  let accounts = await db.getAccounts();
  return accounts.map(account => accountModel.toExternal(account));
};

handlers['api/account-create'] = withMutation(async function ({
  account,
  initialBalance = null,
}) {
  checkFileOpen();
  return handlers['account-create']({
    name: account.name,
    offBudget: account.offbudget,
    closed: account.closed,
    // Current the API expects an amount but it really should expect
    // an integer
    balance: initialBalance != null ? integerToAmount(initialBalance) : null,
  });
});

handlers['api/account-update'] = withMutation(async function ({ id, fields }) {
  checkFileOpen();
  return db.updateAccount({ id, ...accountModel.fromExternal(fields) });
});

handlers['api/account-close'] = withMutation(async function ({
  id,
  transferAccountId,
  transferCategoryId,
}) {
  checkFileOpen();
  return handlers['account-close']({
    id,
    transferAccountId,
    categoryId: transferCategoryId,
  });
});

handlers['api/account-reopen'] = withMutation(async function ({ id }) {
  checkFileOpen();
  return handlers['account-reopen']({ id });
});

handlers['api/account-delete'] = withMutation(async function ({ id }) {
  checkFileOpen();
  return handlers['account-close']({ id, forced: true });
});

handlers['api/categories-get'] = async function ({
  grouped,
}: { grouped? } = {}) {
  checkFileOpen();
  let result = await handlers['get-categories']();
  return grouped
    ? result.grouped.map(categoryGroupModel.toExternal)
    : result.list.map(categoryModel.toExternal);
};

handlers['api/category-group-create'] = withMutation(async function ({
  group,
}) {
  checkFileOpen();
  return handlers['category-group-create']({ name: group.name });
});

handlers['api/category-group-update'] = withMutation(async function ({
  id,
  fields,
}) {
  checkFileOpen();
  return handlers['category-group-update']({
    id,
    ...categoryGroupModel.fromExternal(fields),
  });
});

handlers['api/category-group-delete'] = withMutation(async function ({
  id,
  transferCategoryId,
}) {
  checkFileOpen();
  return handlers['category-group-delete']({
    id,
    transferId: transferCategoryId,
  });
});

handlers['api/category-create'] = withMutation(async function ({ category }) {
  checkFileOpen();
  return handlers['category-create']({
    name: category.name,
    groupId: category.group_id,
    isIncome: category.is_income,
  });
});

handlers['api/category-update'] = withMutation(async function ({ id, fields }) {
  checkFileOpen();
  return handlers['category-update']({
    id,
    ...categoryModel.fromExternal(fields),
  });
});

handlers['api/category-delete'] = withMutation(async function ({
  id,
  transferCategoryId,
}) {
  checkFileOpen();
  return handlers['category-delete']({
    id,
    transferId: transferCategoryId,
  });
});

handlers['api/payees-get'] = async function () {
  checkFileOpen();
  let payees = await handlers['payees-get']();
  return payees.map(payeeModel.toExternal);
};

handlers['api/payee-create'] = withMutation(async function ({ payee }) {
  checkFileOpen();
  return handlers['payee-create']({ name: payee.name });
});

handlers['api/payee-update'] = withMutation(async function ({ id, fields }) {
  checkFileOpen();
  return handlers['payees-batch-change']({
    updated: [{ id, ...payeeModel.fromExternal(fields) }],
  });
});

handlers['api/payee-delete'] = withMutation(async function ({ id }) {
  checkFileOpen();
  return handlers['payees-batch-change']({ deleted: [{ id }] });
});

export default function installAPI(serverHandlers: ServerHandlers) {
  let merged = Object.assign({}, serverHandlers, handlers);
  handlers = merged as Handlers;
  return merged;
}
