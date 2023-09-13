import './polyfills';
import * as injectAPI from '@actual-app/api/injected';
import * as CRDT from '@actual-app/crdt';
import { v4 as uuidv4 } from 'uuid';

import { createTestBudget } from '../mocks/budget';
import { captureException, captureBreadcrumb } from '../platform/exceptions';
import * as asyncStorage from '../platform/server/asyncStorage';
import * as connection from '../platform/server/connection';
import * as fs from '../platform/server/fs';
import logger from '../platform/server/log';
import * as sqlite from '../platform/server/sqlite';
import { isNonProductionEnvironment } from '../shared/environment';
import * as monthUtils from '../shared/months';
import q, { Query } from '../shared/query';
import { FIELD_TYPES as ruleFieldTypes } from '../shared/rules';
import { amountToInteger, stringToInteger } from '../shared/util';
import { Handlers } from '../types/handlers';

import { exportToCSV, exportQueryToCSV } from './accounts/export-to-csv';
import * as link from './accounts/link';
import { parseFile } from './accounts/parse-file';
import { getStartingBalancePayee } from './accounts/payees';
import { Condition, Action, rankRules } from './accounts/rules';
import * as bankSync from './accounts/sync';
import * as rules from './accounts/transaction-rules';
import { batchUpdateTransactions } from './accounts/transactions';
import installAPI from './api';
import { runQuery as aqlQuery } from './aql';
import {
  getAvailableBackups,
  loadBackup,
  makeBackup,
  startBackupService,
  stopBackupService,
} from './backups';
import budgetApp from './budget/app';
import * as budget from './budget/base';
import * as cloudStorage from './cloud-storage';
import * as db from './db';
import * as mappings from './db/mappings';
import * as encryption from './encryption';
import { APIError, TransactionError, PostError, RuleError } from './errors';
import filtersApp from './filters/app';
import { handleBudgetImport } from './importers';
import app from './main-app';
import { mutator, runHandler } from './mutators';
import notesApp from './notes/app';
import * as Platform from './platform';
import { get, post } from './post';
import * as prefs from './prefs';
import schedulesApp from './schedules/app';
import { getServer, setServer } from './server-config';
import * as sheet from './sheet';
import { resolveName, unresolveName } from './spreadsheet/util';
import {
  initialFullSync,
  fullSync,
  batchMessages,
  setSyncingMode,
  makeTestMessage,
  clearFullSyncTimeout,
  resetSync,
  repairSync,
} from './sync';
import * as syncMigrations from './sync/migrate';
import toolsApp from './tools/app';
import { withUndo, clearUndo, undo, redo } from './undo';
import { updateVersion } from './update';
import { uniqueFileName, idFromFileName } from './util/budget-name';

let DEMO_BUDGET_ID = '_demo-budget';
let TEST_BUDGET_ID = '_test-budget';

// util

function onSheetChange({ names }) {
  const nodes = names.map(name => {
    let node = sheet.get()._getNode(name);
    return { name: node.name, value: node.value };
  });
  connection.send('cells-changed', nodes);
}

// handlers

// need to work around the type system here because the object
// is /currently/ empty but we promise to fill it in later
export let handlers = {} as unknown as Handlers;

handlers['undo'] = mutator(async function () {
  return undo();
});

handlers['redo'] = mutator(function () {
  return redo();
});

handlers['transactions-batch-update'] = mutator(async function ({
  added,
  deleted,
  updated,
  learnCategories,
}) {
  return withUndo(async () => {
    let result = await batchUpdateTransactions({
      added,
      updated,
      deleted,
      learnCategories,
    });

    // Return all data updates to the frontend
    return result.updated;
  });
});

handlers['transaction-add'] = mutator(async function (transaction) {
  await handlers['transactions-batch-update']({ added: [transaction] });
  return {};
});

handlers['transaction-update'] = mutator(async function (transaction) {
  await handlers['transactions-batch-update']({ updated: [transaction] });
  return {};
});

handlers['transaction-delete'] = mutator(async function (transaction) {
  await handlers['transactions-batch-update']({ deleted: [transaction] });
  return {};
});

handlers['transactions-parse-file'] = async function ({ filepath, options }) {
  return parseFile(filepath, options);
};

handlers['transactions-export'] = async function ({
  transactions,
  accounts,
  categoryGroups,
  payees,
}) {
  return exportToCSV(transactions, accounts, categoryGroups, payees);
};

handlers['transactions-export-query'] = async function ({ query: queryState }) {
  return exportQueryToCSV(new Query(queryState));
};

handlers['get-categories'] = async function () {
  return {
    grouped: await db.getCategoriesGrouped(),
    list: await db.getCategories(),
  };
};

handlers['get-earliest-transaction'] = async function () {
  let { data } = await aqlQuery(
    q('transactions')
      .options({ splits: 'none' })
      .orderBy({ date: 'asc' })
      .select('*')
      .limit(1),
  );
  return data[0] || null;
};

handlers['get-budget-bounds'] = async function () {
  return budget.createAllBudgets();
};

handlers['rollover-budget-month'] = async function ({ month }) {
  let groups = await db.getCategoriesGrouped();
  let sheetName = monthUtils.sheetForMonth(month);

  function value(name) {
    let v = sheet.getCellValue(sheetName, name);
    return { value: v === '' ? 0 : v, name: resolveName(sheetName, name) };
  }

  let values = [
    value('available-funds'),
    value('last-month-overspent'),
    value('buffered'),
    value('total-budgeted'),
    value('to-budget'),

    value('from-last-month'),
    value('total-income'),
    value('total-spent'),
    value('total-leftover'),
  ];

  for (let group of groups) {
    if (group.is_income) {
      values.push(value('total-income'));

      for (let cat of group.categories) {
        values.push(value(`sum-amount-${cat.id}`));
      }
    } else {
      values = values.concat([
        value(`group-budget-${group.id}`),
        value(`group-sum-amount-${group.id}`),
        value(`group-leftover-${group.id}`),
      ]);

      for (let cat of group.categories) {
        values = values.concat([
          value(`budget-${cat.id}`),
          value(`sum-amount-${cat.id}`),
          value(`leftover-${cat.id}`),
          value(`carryover-${cat.id}`),
        ]);
      }
    }
  }

  return values;
};

handlers['report-budget-month'] = async function ({ month }) {
  let groups = await db.getCategoriesGrouped();
  let sheetName = monthUtils.sheetForMonth(month);

  function value(name) {
    let v = sheet.getCellValue(sheetName, name);
    return { value: v === '' ? 0 : v, name: resolveName(sheetName, name) };
  }

  let values = [
    value('total-budgeted'),
    value('total-budget-income'),
    value('total-saved'),
    value('total-income'),
    value('total-spent'),
    value('real-saved'),
    value('total-leftover'),
  ];

  for (let group of groups) {
    values = values.concat([
      value(`group-budget-${group.id}`),
      value(`group-sum-amount-${group.id}`),
      value(`group-leftover-${group.id}`),
    ]);

    for (let cat of group.categories) {
      values = values.concat([
        value(`budget-${cat.id}`),
        value(`sum-amount-${cat.id}`),
        value(`leftover-${cat.id}`),
      ]);

      if (!group.is_income) {
        values.push(value(`carryover-${cat.id}`));
      }
    }
  }

  return values;
};

handlers['budget-set-type'] = async function ({ type }) {
  if (!prefs.BUDGET_TYPES.includes(type)) {
    throw new Error('Invalid budget type: ' + type);
  }

  // It's already the same; don't do anything
  if (type === prefs.getPrefs().budgetType) {
    return;
  }

  // Save prefs
  return prefs.savePrefs({ budgetType: type });
};

handlers['category-create'] = mutator(async function ({
  name,
  groupId,
  isIncome,
}) {
  return withUndo(async () => {
    if (!groupId) {
      throw APIError('Creating a category: groupId is required');
    }

    return db.insertCategory({
      name,
      cat_group: groupId,
      is_income: isIncome ? 1 : 0,
    });
  });
});

handlers['category-update'] = mutator(async function (category) {
  return withUndo(async () => {
    try {
      await db.updateCategory(category);
    } catch (e) {
      if (e.message.toLowerCase().includes('unique constraint')) {
        return { error: { type: 'category-exists' } };
      }
      throw e;
    }
    return {};
  });
});

handlers['category-move'] = mutator(async function ({ id, groupId, targetId }) {
  return withUndo(async () => {
    await batchMessages(async () => {
      await db.moveCategory(id, groupId, targetId);
    });
    return 'ok';
  });
});

handlers['category-delete'] = mutator(async function ({ id, transferId }) {
  return withUndo(async () => {
    let result = {};
    await batchMessages(async () => {
      let row = await db.first(
        'SELECT is_income FROM categories WHERE id = ?',
        [id],
      );
      if (!row) {
        result = { error: 'no-categories' };
        return;
      }

      let transfer =
        transferId &&
        (await db.first('SELECT is_income FROM categories WHERE id = ?', [
          transferId,
        ]));

      if (!row || (transferId && !transfer)) {
        result = { error: 'no-categories' };
        return;
      } else if (transferId && row.is_income !== transfer.is_income) {
        result = { error: 'category-type' };
        return;
      }

      // Update spreadsheet values if it's an expense category
      // TODO: We should do this for income too if it's a reflect budget
      if (row.is_income === 0) {
        if (transferId) {
          await budget.doTransfer([id], transferId);
        }
      }

      await db.deleteCategory({ id }, transferId);
    });

    return result;
  });
});

handlers['category-group-create'] = mutator(async function ({
  name,
  isIncome,
}) {
  return withUndo(async () => {
    return db.insertCategoryGroup({
      name,
      is_income: isIncome ? 1 : 0,
    });
  });
});

handlers['category-group-update'] = mutator(async function (group) {
  return withUndo(async () => {
    return db.updateCategoryGroup(group);
  });
});

handlers['category-group-move'] = mutator(async function ({ id, targetId }) {
  return withUndo(async () => {
    await batchMessages(async () => {
      await db.moveCategoryGroup(id, targetId);
    });
    return 'ok';
  });
});

handlers['category-group-delete'] = mutator(async function ({
  id,
  transferId,
}) {
  return withUndo(async () => {
    const groupCategories = await db.all(
      'SELECT id FROM categories WHERE cat_group = ? AND tombstone = 0',
      [id],
    );

    return batchMessages(async () => {
      if (transferId) {
        await budget.doTransfer(
          groupCategories.map(c => c.id),
          transferId,
        );
      }
      await db.deleteCategoryGroup({ id }, transferId);
    });
  });
});

handlers['must-category-transfer'] = async function ({ id }) {
  const res = await db.runQuery(
    `SELECT count(t.id) as count FROM transactions t
       LEFT JOIN category_mapping cm ON cm.id = t.category
       WHERE cm.transferId = ? AND t.tombstone = 0`,
    [id],
    true,
  );

  // If there are transactions with this category, return early since
  // we already know it needs to be tranferred
  if (res[0].count !== 0) {
    return true;
  }

  // If there are any non-zero budget values, also force the user to
  // transfer the category.
  return [...sheet.get().meta().createdMonths].some(month => {
    const sheetName = monthUtils.sheetForMonth(month);
    const value = sheet.get().getCellValue(sheetName, 'budget-' + id);

    return value !== 0;
  });
};

handlers['payee-create'] = mutator(async function ({ name }) {
  return withUndo(async () => {
    return db.insertPayee({ name });
  });
});

handlers['payees-get'] = async function () {
  return db.getPayees();
};

handlers['payees-get-orphaned'] = async function () {
  return db.syncGetOrphanedPayees();
};

handlers['payees-get-rule-counts'] = async function () {
  let payeeCounts = {};

  rules.iterateIds(rules.getRules(), 'payee', (rule, id) => {
    if (payeeCounts[id] == null) {
      payeeCounts[id] = 0;
    }
    payeeCounts[id]++;
  });

  return payeeCounts;
};

handlers['payees-merge'] = mutator(async function ({ targetId, mergeIds }) {
  return withUndo(
    async () => {
      return db.mergePayees(targetId, mergeIds);
    },
    { targetId, mergeIds },
  );
});

handlers['payees-batch-change'] = mutator(async function ({
  added,
  deleted,
  updated,
}) {
  return withUndo(async () => {
    return batchMessages(async () => {
      if (deleted) {
        await Promise.all(deleted.map(p => db.deletePayee(p)));
      }

      if (added) {
        await Promise.all(added.map(p => db.insertPayee(p)));
      }

      if (updated) {
        await Promise.all(updated.map(p => db.updatePayee(p)));
      }
    });
  });
});

handlers['payees-check-orphaned'] = async function ({ ids }) {
  let orphaned = new Set(await db.getOrphanedPayees());
  return ids.filter(id => orphaned.has(id));
};

handlers['payees-get-rules'] = async function ({ id }) {
  return rules.getRulesForPayee(id).map(rule => rule.serialize());
};

function validateRule(rule) {
  // Returns an array of errors, the array is the same link as the
  // passed-in `array`, or null if there are no errors
  function runValidation(array, validate) {
    let result = array.map(item => {
      try {
        validate(item);
      } catch (e) {
        if (e instanceof RuleError) {
          console.warn('Invalid rule', e);
          return e.type;
        }
        throw e;
      }
      return null;
    });

    return result.some(Boolean) ? result : null;
  }

  let conditionErrors = runValidation(
    rule.conditions,
    cond =>
      new Condition(
        cond.op,
        cond.field,
        cond.value,
        cond.options,
        ruleFieldTypes,
      ),
  );

  let actionErrors = runValidation(
    rule.actions,
    action =>
      new Action(
        action.op,
        action.field,
        action.value,
        action.options,
        ruleFieldTypes,
      ),
  );

  if (conditionErrors || actionErrors) {
    return {
      conditionErrors,
      actionErrors,
    };
  }

  return null;
}

handlers['rule-validate'] = async function (rule) {
  let error = validateRule(rule);
  return { error };
};

handlers['rule-add'] = mutator(async function (rule) {
  let error = validateRule(rule);
  if (error) {
    return { error };
  }

  let id = await rules.insertRule(rule);
  return { id };
});

handlers['rule-update'] = mutator(async function (rule) {
  let error = validateRule(rule);
  if (error) {
    return { error };
  }

  await rules.updateRule(rule);
  return {};
});

handlers['rule-delete'] = mutator(async function (rule) {
  return rules.deleteRule(rule);
});

handlers['rule-delete-all'] = mutator(async function (ids) {
  let someDeletionsFailed = false;

  await batchMessages(async () => {
    for (let id of ids) {
      let res = await rules.deleteRule({ id });
      if (res === false) {
        someDeletionsFailed = true;
      }
    }
  });

  return { someDeletionsFailed };
});

handlers['rule-apply-actions'] = mutator(async function ({
  transactionIds,
  actions,
}) {
  return rules.applyActions(transactionIds, actions, handlers);
});

handlers['rule-add-payee-rename'] = mutator(async function ({ fromNames, to }) {
  return rules.updatePayeeRenameRule(fromNames, to);
});

handlers['rules-get'] = async function () {
  return rankRules(rules.getRules()).map(rule => rule.serialize());
};

handlers['rule-get'] = async function ({ id }) {
  let rule = rules.getRules().find(rule => rule.id === id);
  return rule ? rule.serialize() : null;
};

handlers['rules-run'] = async function ({ transaction }) {
  return rules.runRules(transaction);
};

handlers['make-filters-from-conditions'] = async function ({ conditions }) {
  return rules.conditionsToAQL(conditions);
};

handlers['getCell'] = async function ({ sheetName, name }) {
  // Fields is no longer used - hardcode
  let fields = ['name', 'value'];
  let node = sheet.get()._getNode(resolveName(sheetName, name));
  if (fields) {
    let res = {};
    fields.forEach(field => {
      if (field === 'run') {
        res[field] = node._run ? node._run.toString() : null;
      } else {
        res[field] = node[field];
      }
    });
    return res;
  } else {
    return node;
  }
};

handlers['getCells'] = async function ({ names }) {
  return names.map(name => ({ value: sheet.get()._getNode(name).value }));
};

handlers['getCellNamesInSheet'] = async function ({ sheetName }) {
  let names = [];
  for (let name of sheet.get().getNodes().keys()) {
    let { sheet: nodeSheet, name: nodeName } = unresolveName(name);
    if (nodeSheet === sheetName) {
      names.push(nodeName);
    }
  }
  return names;
};

handlers['debugCell'] = async function ({ sheetName, name }) {
  let node = sheet.get().getNode(resolveName(sheetName, name));
  return {
    ...node,
    _run: node._run && node._run.toString(),
  };
};

handlers['create-query'] = async function ({ sheetName, name, query }) {
  // Always run it regardless of cache. We don't know anything has changed
  // between the cache value being saved and now
  sheet.get().createQuery(sheetName, name, query);
  return 'ok';
};

handlers['query'] = async function (query) {
  if (query.table == null) {
    throw new Error('query has no table, did you forgot to call `.serialize`?');
  }

  return aqlQuery(query);
};

handlers['bank-delete'] = async function ({ id }) {
  const accts = await db.runQuery(
    'SELECT * FROM accounts WHERE bank = ?',
    [id],
    true,
  );

  await db.delete_('banks', id);
  await Promise.all(
    accts.map(async acct => {
      // TODO: This will not sync across devices because we are bypassing
      // the "recorded" functions
      await db.runQuery('DELETE FROM transactions WHERE acct = ?', [acct.id]);
      await db.delete_('accounts', acct.id);
    }),
  );
  return 'ok';
};

handlers['account-update'] = mutator(async function ({ id, name }) {
  return withUndo(async () => {
    await db.update('accounts', { id, name });
    return {};
  });
});

handlers['accounts-get'] = async function () {
  return db.getAccounts();
};

handlers['account-properties'] = async function ({ id }) {
  const { balance } = await db.first(
    'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0',
    [id],
  );
  const { count } = await db.first(
    'SELECT count(id) as count FROM transactions WHERE acct = ? AND tombstone = 0',
    [id],
  );

  return { balance: balance || 0, numTransactions: count };
};

handlers['accounts-link'] = async function ({
  institution,
  publicToken,
  accountId,
  upgradingId,
}) {
  let bankId = await link.handoffPublicToken(institution, publicToken);

  let [[, userId], [, userKey]] = await asyncStorage.multiGet([
    'user-id',
    'user-key',
  ]);

  // Get all the available accounts and find the selected one
  let accounts = await bankSync.getGoCardlessAccounts(userId, userKey, bankId);
  let account = accounts.find(acct => acct.account_id === accountId);

  await db.update('accounts', {
    id: upgradingId,
    account_id: account.account_id,
    official_name: account.official_name,
    balance_current: amountToInteger(account.balances.current),
    balance_available: amountToInteger(account.balances.available),
    balance_limit: amountToInteger(account.balances.limit),
    mask: account.mask,
    bank: bankId,
  });

  await bankSync.syncAccount(
    userId,
    userKey,
    upgradingId,
    account.account_id,
    bankId,
  );

  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions'],
  });

  return 'ok';
};

handlers['gocardless-accounts-link'] = async function ({
  requisitionId,
  account,
  upgradingId,
}) {
  let id;
  let bank = await link.findOrCreateBank(account.institution, requisitionId);

  if (upgradingId) {
    const accRow = await db.first('SELECT * FROM accounts WHERE id = ?', [
      upgradingId,
    ]);
    id = accRow.id;
    await db.update('accounts', {
      id,
      account_id: account.account_id,
      bank: bank.id,
    });
  } else {
    id = uuidv4();
    await db.insertWithUUID('accounts', {
      id,
      account_id: account.account_id,
      mask: account.mask,
      name: account.name,
      official_name: account.official_name,
      bank: bank.id,
    });
    await db.insertPayee({
      name: '',
      transfer_acct: id,
    });
  }

  await bankSync.syncGoCardlessAccount(
    undefined,
    undefined,
    id,
    account.account_id,
    bank.bank_id,
  );

  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions'],
  });

  return 'ok';
};

handlers['accounts-connect'] = async function ({
  institution,
  publicToken,
  accountIds,
  offbudgetIds,
}) {
  let bankId = await link.handoffPublicToken(institution, publicToken);
  let ids = await link.addAccounts(bankId, accountIds, offbudgetIds);
  return ids;
};

handlers['gocardless-accounts-connect'] = async function ({
  institution,
  publicToken,
  accountIds,
  offbudgetIds,
}) {
  let bankId = await link.handoffPublicToken(institution, publicToken);
  let ids = await link.addGoCardlessAccounts(bankId, accountIds, offbudgetIds);
  return ids;
};

handlers['account-create'] = mutator(async function ({
  name,
  balance,
  offBudget,
  closed,
}) {
  return withUndo(async () => {
    const id = await db.insertAccount({
      name,
      offbudget: offBudget ? 1 : 0,
      closed: closed ? 1 : 0,
    });

    await db.insertPayee({
      name: '',
      transfer_acct: id,
    });

    if (balance != null && balance !== 0) {
      let payee = await getStartingBalancePayee();

      await db.insertTransaction({
        account: id,
        amount: amountToInteger(balance),
        category: offBudget ? null : payee.category,
        payee: payee.id,
        date: monthUtils.currentDay(),
        cleared: true,
        starting_balance_flag: true,
      });
    }

    return id;
  });
});

handlers['account-close'] = mutator(async function ({
  id,
  transferAccountId,
  categoryId,
  forced,
}) {
  // Unlink the account if it's linked. This makes sure to remove it
  // from Plaid. (This should not be undo-able, as it mutates the
  // remote server and the user will have to link the account again)
  await handlers['account-unlink']({ id });

  return withUndo(async () => {
    let account = await db.first(
      'SELECT * FROM accounts WHERE id = ? AND tombstone = 0',
      [id],
    );

    // Do nothing if the account doesn't exist or it's already been
    // closed
    if (!account || account.closed === 1) {
      return;
    }

    const { balance, numTransactions } = await handlers['account-properties']({
      id,
    });

    // If there are no transactions, we can simply delete the account
    if (numTransactions === 0) {
      await db.deleteAccount({ id });
    } else if (forced) {
      let rows = await db.runQuery(
        'SELECT id, transfer_id FROM v_transactions WHERE account = ?',
        [id],
        true,
      );

      let { id: payeeId } = await db.first(
        'SELECT id FROM payees WHERE transfer_acct = ?',
        [id],
      );

      await batchMessages(async () => {
        // TODO: what this should really do is send a special message that
        // automatically marks the tombstone value for all transactions
        // within an account... or something? This is problematic
        // because another client could easily add new data that
        // should be marked as deleted.

        rows.forEach(row => {
          if (row.transfer_id) {
            db.updateTransaction({
              id: row.transfer_id,
              payee: null,
              transfer_id: null,
            });
          }

          db.deleteTransaction({ id: row.id });
        });

        db.deleteAccount({ id });
        db.deleteTransferPayee({ id: payeeId });
      });
    } else {
      if (balance !== 0 && transferAccountId == null) {
        throw APIError('balance is non-zero: transferAccountId is required');
      }

      await db.update('accounts', { id, closed: 1 });

      // If there is a balance we need to transfer it to the specified
      // account (and possibly categorize it)
      if (balance !== 0) {
        let { id: payeeId } = await db.first(
          'SELECT id FROM payees WHERE transfer_acct = ?',
          [transferAccountId],
        );

        await handlers['transaction-add']({
          id: uuidv4(),
          payee: payeeId,
          amount: -balance,
          account: id,
          date: monthUtils.currentDay(),
          notes: 'Closing account',
          category: categoryId || null,
        });
      }
    }
  });
});

handlers['account-reopen'] = mutator(async function ({ id }) {
  return withUndo(async () => {
    await db.update('accounts', { id, closed: 0 });
  });
});

handlers['account-move'] = mutator(async function ({ id, targetId }) {
  return withUndo(async () => {
    await db.moveAccount(id, targetId);
  });
});

let stopPolling = false;

handlers['poll-web-token'] = async function ({ token }) {
  let [[, userId], [, key]] = await asyncStorage.multiGet([
    'user-id',
    'user-key',
  ]);

  let startTime = Date.now();
  stopPolling = false;

  async function getData(cb) {
    if (stopPolling) {
      return;
    }

    if (Date.now() - startTime >= 1000 * 60 * 10) {
      cb('timeout');
      return;
    }

    let data = await post(
      getServer().PLAID_SERVER + '/get-web-token-contents',
      {
        userId,
        key,
        token,
      },
    );

    if (data) {
      if (data.error) {
        cb('unknown');
      } else {
        cb(null, data);
      }
    } else {
      setTimeout(() => getData(cb), 3000);
    }
  }

  return new Promise(resolve => {
    getData((error, data) => {
      if (error) {
        resolve({ error });
      } else {
        resolve({ data });
      }
    });
  });
};

handlers['poll-web-token-stop'] = async function () {
  stopPolling = true;
  return 'ok';
};

handlers['accounts-sync'] = async function ({ id }) {
  let [[, userId], [, userKey]] = await asyncStorage.multiGet([
    'user-id',
    'user-key',
  ]);
  let accounts = await db.runQuery(
    `SELECT a.*, b.id as bankId FROM accounts a
         LEFT JOIN banks b ON a.bank = b.id
         WHERE a.tombstone = 0 AND a.closed = 0`,
    [],
    true,
  );

  if (id) {
    accounts = accounts.filter(acct => acct.id === id);
  }

  let errors = [];
  let newTransactions = [];
  let matchedTransactions = [];
  let updatedAccounts = [];

  for (let i = 0; i < accounts.length; i++) {
    const acct = accounts[i];
    if (acct.bankId) {
      try {
        const res = await bankSync.syncAccount(
          userId,
          userKey,
          acct.id,
          acct.account_id,
          acct.bankId,
        );
        let { added, updated } = res;

        newTransactions = newTransactions.concat(added);
        matchedTransactions = matchedTransactions.concat(updated);

        if (added.length > 0 || updated.length > 0) {
          updatedAccounts = updatedAccounts.concat(acct.id);
        }
      } catch (err) {
        if (err.type === 'BankSyncError') {
          errors.push({
            type: 'SyncError',
            accountId: acct.id,
            message: 'Failed syncing account “' + acct.name + '.”',
            category: err.category,
            code: err.code,
          });
        } else if (err instanceof PostError && err.reason !== 'internal') {
          errors.push({
            accountId: acct.id,
            message: `Account “${acct.name}” is not linked properly. Please link it again`,
          });
        } else {
          errors.push({
            accountId: acct.id,
            message:
              'There was an internal error. Please get in touch https://actualbudget.org/contact for support.',
            internal: err.stack,
          });

          err.message = 'Failed syncing account: ' + err.message;

          captureException(err);
        }
      }
    }
  }

  if (updatedAccounts.length > 0) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });
  }

  return { errors, newTransactions, matchedTransactions, updatedAccounts };
};

handlers['secret-set'] = async function ({ name, value }) {
  let userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  try {
    return await post(
      getServer().BASE_SERVER + '/secret',
      {
        name,
        value,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
    );
  } catch (error) {
    console.error(error);
    return { error: 'failed' };
  }
};

handlers['secret-check'] = async function (name) {
  let userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  try {
    return await get(getServer().BASE_SERVER + '/secret/' + name, {
      'X-ACTUAL-TOKEN': userToken,
    });
  } catch (error) {
    console.error(error);
    return { error: 'failed' };
  }
};

handlers['gocardless-poll-web-token'] = async function ({
  upgradingAccountId,
  requisitionId,
}) {
  let userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return null;

  let startTime = Date.now();
  stopPolling = false;

  async function getData(cb) {
    if (stopPolling) {
      return;
    }

    if (Date.now() - startTime >= 1000 * 60 * 10) {
      cb('timeout');
      return;
    }

    let data = await post(
      getServer().GOCARDLESS_SERVER + '/get-accounts',
      {
        upgradingAccountId,
        requisitionId,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
    );

    if (data) {
      if (data.error) {
        cb('unknown');
      } else {
        cb(null, data);
      }
    } else {
      setTimeout(() => getData(cb), 3000);
    }
  }

  return new Promise(resolve => {
    getData((error, data) => {
      if (error) {
        resolve({ error });
      } else {
        resolve({ data });
      }
    });
  });
};

handlers['gocardless-status'] = async function () {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  return post(
    getServer().GOCARDLESS_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
};

handlers['gocardless-get-banks'] = async function (country) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  return post(
    getServer().GOCARDLESS_SERVER + '/get-banks',
    { country, showDemo: isNonProductionEnvironment() },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
};

handlers['gocardless-poll-web-token-stop'] = async function () {
  stopPolling = true;
  return 'ok';
};

handlers['gocardless-create-web-token'] = async function ({
  upgradingAccountId,
  institutionId,
  accessValidForDays,
}) {
  let userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  try {
    return await post(
      getServer().GOCARDLESS_SERVER + '/create-web-token',
      {
        upgradingAccountId,
        institutionId,
        accessValidForDays,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
    );
  } catch (error) {
    console.error(error);
    return { error: 'failed' };
  }
};

handlers['gocardless-accounts-sync'] = async function ({ id }) {
  let [[, userId], [, userKey]] = await asyncStorage.multiGet([
    'user-id',
    'user-key',
  ]);
  let accounts = await db.runQuery(
    `SELECT a.*, b.bank_id as bankId FROM accounts a
         LEFT JOIN banks b ON a.bank = b.id
         WHERE a.tombstone = 0 AND a.closed = 0`,
    [],
    true,
  );

  if (id) {
    accounts = accounts.filter(acct => acct.id === id);
  }

  let errors = [];
  let newTransactions = [];
  let matchedTransactions = [];
  let updatedAccounts = [];

  for (let i = 0; i < accounts.length; i++) {
    const acct = accounts[i];
    if (acct.bankId) {
      try {
        const res = await bankSync.syncGoCardlessAccount(
          userId,
          userKey,
          acct.id,
          acct.account_id,
          acct.bankId,
        );
        let { added, updated } = res;

        newTransactions = newTransactions.concat(added);
        matchedTransactions = matchedTransactions.concat(updated);

        if (added.length > 0 || updated.length > 0) {
          updatedAccounts = updatedAccounts.concat(acct.id);
        }
      } catch (err) {
        if (err.type === 'BankSyncError') {
          errors.push({
            type: 'SyncError',
            accountId: acct.id,
            message: 'Failed syncing account “' + acct.name + '.”',
            category: err.category,
            code: err.code,
          });
        } else if (err instanceof PostError && err.reason !== 'internal') {
          errors.push({
            accountId: acct.id,
            message: `Account “${acct.name}” is not linked properly. Please link it again`,
          });
        } else {
          errors.push({
            accountId: acct.id,
            message:
              'There was an internal error. Please get in touch https://actualbudget.org/contact for support.',
            internal: err.stack,
          });

          err.message = 'Failed syncing account: ' + err.message;

          captureException(err);
        }
      }
    }
  }

  if (updatedAccounts.length > 0) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });
  }

  return { errors, newTransactions, matchedTransactions, updatedAccounts };
};

handlers['transactions-import'] = mutator(function ({
  accountId,
  transactions,
}) {
  return withUndo(async () => {
    if (typeof accountId !== 'string') {
      throw APIError('transactions-import: accountId must be an id');
    }

    try {
      return await bankSync.reconcileTransactions(accountId, transactions);
    } catch (err) {
      if (err instanceof TransactionError) {
        return { errors: [{ message: err.message }], added: [], updated: [] };
      }

      throw err;
    }
  });
});

handlers['account-unlink'] = mutator(async function ({ id }) {
  let { bank: bankId } = await db.first(
    'SELECT bank FROM accounts WHERE id = ?',
    [id],
  );

  if (!bankId) {
    return 'ok';
  }

  await db.updateAccount({
    id,
    account_id: null,
    bank: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
  });

  let { count } = await db.first(
    'SELECT COUNT(*) as count FROM accounts WHERE bank = ?',
    [bankId],
  );

  // No more accounts are associated with this bank. We can remove
  // it from GoCardless.
  let userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return 'ok';
  }

  if (count === 0) {
    let { bank_id: requisitionId } = await db.first(
      'SELECT bank_id FROM banks WHERE id = ?',
      [bankId],
    );
    try {
      await post(
        getServer().GOCARDLESS_SERVER + '/remove-account',
        {
          requisitionId: requisitionId,
        },
        {
          'X-ACTUAL-TOKEN': userToken,
        },
      );
    } catch (error) {
      console.log({ error });
    }
  }

  return 'ok';
});

handlers['make-plaid-public-token'] = async function ({ bankId }) {
  let [[, userId], [, userKey]] = await asyncStorage.multiGet([
    'user-id',
    'user-key',
  ]);

  let data = await post(getServer().PLAID_SERVER + '/make-public-token', {
    userId: userId,
    key: userKey,
    item_id: '' + bankId,
  });

  if (data.error_code) {
    return { error: '', code: data.error_code, type: data.error_type };
  }

  return { linkToken: data.link_token };
};

handlers['save-global-prefs'] = async function (prefs) {
  if ('maxMonths' in prefs) {
    await asyncStorage.setItem('max-months', '' + prefs.maxMonths);
  }
  if ('autoUpdate' in prefs) {
    await asyncStorage.setItem('auto-update', '' + prefs.autoUpdate);
    process.send({ type: 'shouldAutoUpdate', flag: prefs.autoUpdate });
  }
  if ('documentDir' in prefs) {
    if (await fs.exists(prefs.documentDir)) {
      await asyncStorage.setItem('document-dir', prefs.documentDir);
    }
  }
  if ('floatingSidebar' in prefs) {
    await asyncStorage.setItem('floating-sidebar', '' + prefs.floatingSidebar);
  }
  if ('theme' in prefs) {
    await asyncStorage.setItem('theme', prefs.theme);
  }
  return 'ok';
};

handlers['load-global-prefs'] = async function () {
  let [
    [, floatingSidebar],
    [, maxMonths],
    [, autoUpdate],
    [, documentDir],
    [, encryptKey],
    [, theme],
  ] = await asyncStorage.multiGet([
    'floating-sidebar',
    'max-months',
    'auto-update',
    'document-dir',
    'encrypt-key',
    'theme',
  ]);
  return {
    floatingSidebar: floatingSidebar === 'true' ? true : false,
    maxMonths: stringToInteger(maxMonths || ''),
    autoUpdate: autoUpdate == null || autoUpdate === 'true' ? true : false,
    documentDir: documentDir || getDefaultDocumentDir(),
    keyId: encryptKey && JSON.parse(encryptKey).id,
    theme: theme === 'light' || theme === 'dark' ? theme : 'light',
  };
};

handlers['save-prefs'] = async function (prefsToSet) {
  let { cloudFileId } = prefs.getPrefs();

  // Need to sync the budget name on the server as well
  if (prefsToSet.budgetName && cloudFileId) {
    let userToken = await asyncStorage.getItem('user-token');

    await post(getServer().SYNC_SERVER + '/update-user-filename', {
      token: userToken,
      fileId: cloudFileId,
      name: prefsToSet.budgetName,
    });
  }

  await prefs.savePrefs(prefsToSet);
  return 'ok';
};

handlers['load-prefs'] = async function () {
  return prefs.getPrefs();
};

handlers['sync-reset'] = async function () {
  return await resetSync();
};

handlers['sync-repair'] = async function () {
  await repairSync();
};

// A user can only enable/change their key with the file loaded. This
// will change in the future: during onboarding the user should be
// able to enable encryption. (Imagine if they are importing data from
// another source, they should be able to encrypt first)
handlers['key-make'] = async function ({ password }) {
  if (!prefs.getPrefs()) {
    throw new Error('user-set-key must be called with file loaded');
  }

  let salt = encryption.randomBytes(32).toString('base64');
  let id = uuidv4();
  let key = await encryption.createKey({ id, password, salt });

  // Load the key
  await encryption.loadKey(key);

  // Make some test data to use if the key is valid or not
  let testContent = await makeTestMessage(key.getId());

  // Changing your key necessitates a sync reset as well. This will
  // clear all existing encrypted data from the server so you won't
  // have a mix of data encrypted with different keys.
  return await resetSync({
    key,
    salt,
    testContent: JSON.stringify({
      ...testContent,
      value: testContent.value.toString('base64'),
    }),
  });
};

// This can be called both while a file is already loaded or not. This
// will see if a key is valid and if so save it off.
handlers['key-test'] = async function ({ fileId, password }) {
  let userToken = await asyncStorage.getItem('user-token');

  if (fileId == null) {
    fileId = prefs.getPrefs().cloudFileId;
  }

  let res;
  try {
    res = await post(getServer().SYNC_SERVER + '/user-get-key', {
      token: userToken,
      fileId,
    });
  } catch (e) {
    console.log(e);
    return { error: { reason: 'network' } };
  }

  let { id, salt, test } = res;

  if (test == null) {
    return { error: { reason: 'old-key-style' } };
  }

  test = JSON.parse(test);

  let key = await encryption.createKey({ id, password, salt });
  encryption.loadKey(key);

  try {
    await encryption.decrypt(Buffer.from(test.value, 'base64'), test.meta);
  } catch (e) {
    console.log(e);

    // Unload the key, it's invalid
    encryption.unloadKey(key);
    return { error: { reason: 'decrypt-failure' } };
  }

  // Persist key in async storage
  let keys = JSON.parse((await asyncStorage.getItem(`encrypt-keys`)) || '{}');
  keys[fileId] = key.serialize();
  await asyncStorage.setItem('encrypt-keys', JSON.stringify(keys));

  // Save the key id in prefs if the are loaded. If they aren't, we
  // are testing a key to download a file and when the file is
  // actually downloaded it will update the prefs with the latest key id
  if (prefs.getPrefs()) {
    await prefs.savePrefs({ encryptKeyId: key.getId() });
  }

  return {};
};

handlers['get-did-bootstrap'] = async function () {
  return Boolean(await asyncStorage.getItem('did-bootstrap'));
};

handlers['subscribe-needs-bootstrap'] = async function ({
  url,
}: { url? } = {}) {
  try {
    if (!getServer(url)) {
      return { bootstrapped: true, hasServer: false };
    }
  } catch (err) {
    return { error: 'get-server-failure' };
  }

  let res;
  try {
    res = await get(getServer(url).SIGNUP_SERVER + '/needs-bootstrap');
  } catch (err) {
    return { error: 'network-failure' };
  }

  try {
    res = JSON.parse(res);
  } catch (err) {
    return { error: 'parse-failure' };
  }

  if (res.status === 'error') {
    return { error: res.reason };
  }

  return { bootstrapped: res.data.bootstrapped, hasServer: true };
};

handlers['subscribe-bootstrap'] = async function ({ password }) {
  let res;
  try {
    res = await post(getServer().SIGNUP_SERVER + '/bootstrap', { password });
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }

  if (res.token) {
    await asyncStorage.setItem('user-token', res.token);
    return {};
  }
  return { error: 'internal' };
};

handlers['subscribe-get-user'] = async function () {
  if (!getServer()) {
    if (!(await asyncStorage.getItem('did-bootstrap'))) {
      return null;
    }
    return { offline: false };
  }

  let userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return null;
  }

  try {
    const res = await get(getServer().SIGNUP_SERVER + '/validate', {
      headers: {
        'X-ACTUAL-TOKEN': userToken,
      },
    });
    const { status, reason } = JSON.parse(res);

    if (status === 'error') {
      if (reason === 'unauthorized') {
        return null;
      }
      return { offline: true };
    }

    return { offline: false };
  } catch (e) {
    console.log(e);
    return { offline: true };
  }
};

handlers['subscribe-change-password'] = async function ({ password }) {
  let userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return { error: 'not-logged-in' };
  }

  try {
    await post(getServer().SIGNUP_SERVER + '/change-password', {
      token: userToken,
      password,
    });
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }

  return {};
};

handlers['subscribe-sign-in'] = async function ({ password }) {
  let res = await post(getServer().SIGNUP_SERVER + '/login', {
    password,
  });

  if (res.token) {
    await asyncStorage.setItem('user-token', res.token);
    return {};
  }

  return { error: 'invalid-password' };
};

handlers['subscribe-sign-out'] = async function () {
  encryption.unloadAllKeys();
  await asyncStorage.multiRemove([
    'user-token',
    'encrypt-keys',
    'lastBudget',
    'readOnly',
  ]);
  return 'ok';
};

handlers['get-server-version'] = async function () {
  if (!getServer()) {
    return { error: 'no-server' };
  }

  let version;
  try {
    const res = await get(getServer().BASE_SERVER + '/info');

    const info = JSON.parse(res);
    version = info.build.version;
  } catch (err) {
    return { error: 'network-failure' };
  }

  return { version };
};

handlers['get-server-url'] = async function () {
  return getServer() && getServer().BASE_SERVER;
};

handlers['set-server-url'] = async function ({ url, validate = true }) {
  if (url == null) {
    await asyncStorage.removeItem('user-token');
  } else {
    url = url.replace(/\/+$/, '');

    if (validate) {
      // Validate the server is running
      let { error } = await runHandler(handlers['subscribe-needs-bootstrap'], {
        url,
      });
      if (error) {
        return { error };
      }
    }
  }

  await asyncStorage.setItem('server-url', url);
  await asyncStorage.setItem('did-bootstrap', true);
  setServer(url);
  return {};
};

handlers['sync'] = async function () {
  return fullSync();
};

handlers['get-budgets'] = async function () {
  const paths = await fs.listDir(fs.getDocumentDir());
  const budgets = (
    await Promise.all(
      paths.map(async name => {
        const prefsPath = fs.join(fs.getDocumentDir(), name, 'metadata.json');
        if (await fs.exists(prefsPath)) {
          let prefs;
          try {
            prefs = JSON.parse(await fs.readFile(prefsPath));
          } catch (e) {
            console.log('Error parsing metadata:', e.stack);
            return;
          }

          // We treat the directory name as the canonical id so that if
          // the user moves it around/renames/etc, nothing breaks. The
          // id is stored in prefs just for convenience (and the prefs
          // will always update to the latest given id)
          if (name !== DEMO_BUDGET_ID) {
            return {
              id: name,
              cloudFileId: prefs.cloudFileId,
              groupId: prefs.groupId,
              name: prefs.budgetName || '(no name)',
            };
          }
        }

        return null;
      }),
    )
  ).filter(x => x);

  return budgets;
};

handlers['get-remote-files'] = async function () {
  return cloudStorage.listRemoteFiles();
};

handlers['reset-budget-cache'] = mutator(async function () {
  // Recomputing everything will update the cache
  await sheet.loadUserBudgets(db);
  sheet.get().recomputeAll();
  await sheet.waitOnSpreadsheet();
});

handlers['upload-budget'] = async function ({ id }: { id? } = {}) {
  if (id) {
    if (prefs.getPrefs()) {
      throw new Error('upload-budget: id given but prefs already loaded');
    }

    await prefs.loadPrefs(id);
  }

  try {
    await cloudStorage.upload();
  } catch (e) {
    console.log(e);
    if (e.type === 'FileUploadError') {
      return { error: e };
    }
    captureException(e);
    return { error: { reason: 'internal' } };
  } finally {
    if (id) {
      prefs.unloadPrefs();
    }
  }

  return {};
};

handlers['download-budget'] = async function ({ fileId }) {
  let result;
  try {
    result = await cloudStorage.download(fileId);
  } catch (e) {
    if (e.type === 'FileDownloadError') {
      if (e.reason === 'file-exists' && e.meta.id) {
        await prefs.loadPrefs(e.meta.id);
        let name = prefs.getPrefs().budgetName;
        prefs.unloadPrefs();

        e.meta = { ...e.meta, name };
      }

      return { error: e };
    } else {
      captureException(e);
      return { error: { reason: 'internal' } };
    }
  }

  let id = result.id;
  await handlers['load-budget']({ id });
  result = await handlers['sync-budget']();
  await handlers['close-budget']();
  if (result.error) {
    return result;
  }
  return { id };
};

// open and sync, but don’t close
handlers['sync-budget'] = async function () {
  setSyncingMode('enabled');
  let result = await initialFullSync();

  return result;
};

handlers['load-budget'] = async function ({ id }) {
  let currentPrefs = prefs.getPrefs();

  if (currentPrefs) {
    if (currentPrefs.id === id) {
      // If it's already loaded, do nothing
      return {};
    } else {
      // Otherwise, close the currently loaded budget
      await handlers['close-budget']();
    }
  }

  let res = await loadBudget(id);

  return res;
};

handlers['create-demo-budget'] = async function () {
  // Make sure the read only flag isn't leftover (normally it's
  // reset when signing in, but you don't have to sign in for the
  // demo budget)
  await asyncStorage.setItem('readOnly', '');

  return handlers['create-budget']({
    budgetName: 'Demo Budget',
    testMode: true,
    testBudgetId: DEMO_BUDGET_ID,
  });
};

handlers['close-budget'] = async function () {
  captureBreadcrumb({ message: 'Closing budget' });

  // The spreadsheet may be running, wait for it to complete
  await sheet.waitOnSpreadsheet();
  sheet.unloadSpreadsheet();

  clearFullSyncTimeout();
  await app.stopServices();

  await db.closeDatabase();

  try {
    await asyncStorage.setItem('lastBudget', '');
  } catch (e) {
    // This might fail if we are shutting down after failing to load a
    // budget. We want to unload whatever has already been loaded but
    // be resilient to anything failing
  }

  prefs.unloadPrefs();
  stopBackupService();
  return 'ok';
};

handlers['delete-budget'] = async function ({ id, cloudFileId }) {
  // If it's a cloud file, you can delete it from the server by
  // passing its cloud id
  if (cloudFileId) {
    await cloudStorage.removeFile(cloudFileId).catch(err => {});
  }

  // If a local file exists, you can delete it by passing its local id
  if (id) {
    let budgetDir = fs.getBudgetDir(id);
    await fs.removeDirRecursively(budgetDir);
  }

  return 'ok';
};

handlers['create-budget'] = async function ({
  budgetName,
  avoidUpload,
  testMode,
  testBudgetId,
}: {
  budgetName?;
  avoidUpload?;
  testMode?;
  testBudgetId?;
} = {}) {
  let id;
  if (testMode) {
    budgetName = budgetName || 'Test Budget';
    id = testBudgetId || TEST_BUDGET_ID;

    if (await fs.exists(fs.getBudgetDir(id))) {
      await fs.removeDirRecursively(fs.getBudgetDir(id));
    }
  } else {
    // Generate budget name if not given
    if (!budgetName) {
      // Unfortunately we need to load all of the existing files first
      // so we can detect conflicting names.
      let files = await handlers['get-budgets']();
      budgetName = await uniqueFileName(files);
    }

    id = await idFromFileName(budgetName);
  }

  let budgetDir = fs.getBudgetDir(id);
  await fs.mkdir(budgetDir);

  // Create the initial database
  await fs.copyFile(fs.bundledDatabasePath, fs.join(budgetDir, 'db.sqlite'));

  // Create the initial prefs file
  await fs.writeFile(
    fs.join(budgetDir, 'metadata.json'),
    JSON.stringify(prefs.getDefaultPrefs(id, budgetName)),
  );

  // Load it in
  let { error } = await loadBudget(id);
  if (error) {
    console.log('Error creating budget: ' + error);
    return { error };
  }

  if (!avoidUpload && !testMode) {
    try {
      await cloudStorage.upload();
    } catch (e) {
      // Ignore any errors uploading. If they are offline they should
      // still be able to create files.
    }
  }

  if (testMode) {
    await createTestBudget(handlers);
  }

  return {};
};

handlers['import-budget'] = async function ({ filepath, type }) {
  try {
    if (!(await fs.exists(filepath))) {
      throw new Error(`File not found at the provided path: ${filepath}`);
    }

    let buffer = Buffer.from(await fs.readFile(filepath, 'binary'));
    let results = await handleBudgetImport(type, filepath, buffer);
    return results || {};
  } catch (err) {
    err.message = 'Error importing budget: ' + err.message;
    captureException(err);
    return { error: 'internal-error' };
  }
};

handlers['export-budget'] = async function () {
  try {
    return {
      data: await cloudStorage.exportBuffer(),
    };
  } catch (err) {
    err.message = 'Error exporting budget: ' + err.message;
    captureException(err);
    return { error: 'internal-error' };
  }
};

async function loadBudget(id) {
  let dir;
  try {
    dir = fs.getBudgetDir(id);
  } catch (e) {
    captureException(
      new Error('`getBudgetDir` failed in `loadBudget`: ' + e.message),
    );
    return { error: 'budget-not-found' };
  }

  captureBreadcrumb({ message: 'Loading budget ' + dir });

  if (!(await fs.exists(dir))) {
    captureException(new Error('budget directory does not exist'));
    return { error: 'budget-not-found' };
  }

  try {
    await prefs.loadPrefs(id);
    await db.openDatabase(id);
  } catch (e) {
    captureBreadcrumb({ message: 'Error loading budget ' + id });
    captureException(e);
    await handlers['close-budget']();
    return { error: 'opening-budget' };
  }

  // Older versions didn't tag the file with the current user, so do
  // so now
  if (!prefs.getPrefs().userId) {
    let userId = await asyncStorage.getItem('user-token');
    prefs.savePrefs({ userId });
  }

  try {
    await updateVersion();
  } catch (e) {
    console.warn('Error updating', e);
    let result;
    if (e.message.includes('out-of-sync-migrations')) {
      result = { error: 'out-of-sync-migrations' };
    } else if (e.message.includes('out-of-sync-data')) {
      result = { error: 'out-of-sync-data' };
    } else {
      captureException(e);
      logger.info('Error updating budget ' + id, e);
      console.log('Error updating budget', e);
      result = { error: 'loading-budget' };
    }

    await handlers['close-budget']();
    return result;
  }

  await db.loadClock();

  if (prefs.getPrefs().resetClock) {
    // If we need to generate a fresh clock, we need to generate a new
    // client id. This happens when the database is transferred to a
    // new device.
    //
    // TODO: The client id should be stored elsewhere. It shouldn't
    // work this way, but it's fine for now.
    CRDT.getClock().timestamp.setNode(CRDT.makeClientId());
    await db.runQuery(
      'INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)',
      [CRDT.serializeClock(CRDT.getClock())],
    );

    await prefs.savePrefs({ resetClock: false });
  }

  if (
    !Platform.isWeb &&
    !Platform.isMobile &&
    process.env.NODE_ENV !== 'test'
  ) {
    startBackupService(id);
  }

  try {
    await sheet.loadSpreadsheet(db, onSheetChange);
  } catch (e) {
    captureException(e);
    await handlers['close-budget']();
    return { error: 'opening-budget' };
  }

  // This is a bit leaky, but we need to set the initial budget type
  sheet.get().meta().budgetType = prefs.getPrefs().budgetType;
  await budget.createAllBudgets();

  // Load all the in-memory state
  await mappings.loadMappings();
  await rules.loadRules();
  await syncMigrations.listen();
  await app.startServices();

  clearUndo();

  // Ensure that syncing is enabled
  if (process.env.NODE_ENV !== 'test') {
    if (id === DEMO_BUDGET_ID) {
      setSyncingMode('disabled');
    } else {
      if (getServer()) {
        setSyncingMode('enabled');
      } else {
        setSyncingMode('disabled');
      }

      await asyncStorage.setItem('lastBudget', id);

      // Only upload periodically on desktop
      if (!Platform.isMobile) {
        await cloudStorage.possiblyUpload();
      }
    }
  }

  app.events.emit('load-budget', { id });

  return {};
}

handlers['upload-file-web'] = async function ({ filename, contents }) {
  if (!Platform.isWeb) {
    return null;
  }

  await fs.writeFile('/uploads/' + filename, contents);
  return {};
};

handlers['backups-get'] = async function ({ id }) {
  return getAvailableBackups(id);
};

handlers['backup-load'] = async function ({ id, backupId }) {
  await loadBackup(id, backupId);
};

handlers['backup-make'] = async function ({ id }) {
  await makeBackup(id);
};

handlers['get-last-opened-backup'] = async function () {
  const id = await asyncStorage.getItem('lastBudget');
  if (id && id !== '') {
    const budgetDir = fs.getBudgetDir(id);

    // We never want to give back a budget that does not exist on the
    // filesystem anymore, so first check that it exists
    if (await fs.exists(budgetDir)) {
      return id;
    }
  }
  return null;
};

handlers['app-focused'] = async function () {
  if (prefs.getPrefs() && prefs.getPrefs().id) {
    // First we sync
    fullSync();
  }
};

handlers = installAPI(handlers) as Handlers;

injectAPI.override((name, args) => runHandler(app.handlers[name], args));

// A hack for now until we clean up everything
app.handlers = handlers;
app.combine(schedulesApp, budgetApp, notesApp, toolsApp, filtersApp);

function getDefaultDocumentDir() {
  if (Platform.isMobile) {
    // On mobile, unfortunately we need to be backwards compatible
    // with the old folder structure which does not store files inside
    // of an `Actual` directory. In the future, if we really care, we
    // can migrate them, but for now just return the documents dir
    return process.env.ACTUAL_DOCUMENT_DIR;
  }
  return fs.join(process.env.ACTUAL_DOCUMENT_DIR, 'Actual');
}

async function setupDocumentsDir() {
  async function ensureExists(dir) {
    // Make sure the document folder exists
    if (!(await fs.exists(dir))) {
      await fs.mkdir(dir);
    }
  }

  let documentDir = await asyncStorage.getItem('document-dir');

  // Test the existing documents directory to make sure it's a valid
  // path that exists, and if it errors fallback to the default one
  if (documentDir) {
    try {
      await ensureExists(documentDir);
    } catch (e) {
      documentDir = null;
    }
  }

  if (!documentDir) {
    documentDir = getDefaultDocumentDir();
  }

  await ensureExists(documentDir);
  fs._setDocumentDir(documentDir);
}

// eslint-disable-next-line import/no-unused-modules
export async function initApp(isDev, socketName) {
  await sqlite.init();
  await Promise.all([asyncStorage.init(), fs.init()]);
  await setupDocumentsDir();

  let keysStr = await asyncStorage.getItem('encrypt-keys');
  if (keysStr) {
    try {
      let keys = JSON.parse(keysStr);

      // Load all the keys
      await Promise.all(
        Object.keys(keys).map(fileId => {
          return encryption.loadKey(keys[fileId]);
        }),
      );
    } catch (e) {
      console.log('Error loading key', e);
      throw new Error('load-key-error');
    }
  }

  // if (isDev) {
  // const lastBudget = await asyncStorage.getItem('lastBudget');
  // if (lastBudget) {
  //   loadBudget(lastBudget);
  // }
  // }

  let url = await asyncStorage.getItem('server-url');

  // TODO: remove this if statement after a few releases
  if (url === 'https://not-configured/') {
    url = null;
    await asyncStorage.setItem('server-url', null);
    await asyncStorage.setItem('did-bootstrap', true);
  }

  if (!url) {
    await asyncStorage.removeItem('user-token');
  }
  setServer(url);

  connection.init(socketName, app.handlers);

  if (!isDev && !Platform.isMobile && !Platform.isWeb) {
    let autoUpdate = await asyncStorage.getItem('auto-update');
    process.send({
      type: 'shouldAutoUpdate',
      flag: autoUpdate == null || autoUpdate === 'true',
    });
  }

  if (isDev) {
    global.$send = (name, args) => runHandler(app.handlers[name], args);
    global.$query = aqlQuery;
    global.$q = q;
    global.$db = db;
    global.$setSyncingMode = setSyncingMode;
  }
}

// eslint-disable-next-line import/no-unused-modules
export async function init(config) {
  // Get from build

  let dataDir, serverURL;
  if (config) {
    dataDir = config.dataDir;
    serverURL = config.serverURL;
  } else {
    dataDir = process.env.ACTUAL_DATA_DIR;
    serverURL = process.env.ACTUAL_SERVER_URL;
  }

  await sqlite.init();
  await Promise.all([asyncStorage.init({ persist: false }), fs.init()]);
  fs._setDocumentDir(dataDir || process.cwd());

  if (serverURL) {
    setServer(serverURL);

    if (config.password) {
      await runHandler(handlers['subscribe-sign-in'], {
        password: config.password,
      });
    }
  } else {
    // This turns off all server URLs. In this mode we don't want any
    // access to the server, we are doing things locally
    setServer(null);

    app.events.on('load-budget', () => {
      setSyncingMode('offline');
    });
  }

  return lib;
}

// Export a few things required for the platform
// eslint-disable-next-line import/no-unused-modules
export const lib = {
  getDataDir: fs.getDataDir,
  sendMessage: (msg, args) => connection.send(msg, args),
  send: async (name, args) => {
    let res = await runHandler(app.handlers[name], args);
    return res;
  },
  on: (name, func) => app.events.on(name, func),
  q,
  db,
};
