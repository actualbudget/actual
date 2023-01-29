import LRU from 'lru-cache';

import fs from '../../platform/server/fs';
import * as sqlite from '../../platform/server/sqlite';
import { groupById } from '../../shared/util';
import {
  schema,
  schemaConfig,
  convertForInsert,
  convertForUpdate,
  convertFromSelect
} from '../aql';
import {
  makeClock,
  setClock,
  serializeClock,
  deserializeClock,
  makeClientId,
  Timestamp
} from '../crdt';
import {
  accountModel,
  categoryModel,
  categoryGroupModel,
  payeeModel,
  payeeRuleModel
} from '../models';
import { sendMessages, batchMessages } from '../sync';

import { shoveSortOrders, SORT_INCREMENT } from './sort';

export { toDateRepr, fromDateRepr } from '../models';

const uuid = require('../../platform/uuid');

let dbPath;
let db;

// Util

export function getDatabasePath() {
  return dbPath;
}

export async function openDatabase(id) {
  if (db) {
    await sqlite.closeDatabase(db);
  }

  dbPath = fs.join(fs.getBudgetDir(id), 'db.sqlite');
  setDatabase(await sqlite.openDatabase(dbPath));

  // await execQuery('PRAGMA journal_mode = WAL');
}

export async function reopenDatabase() {
  await sqlite.closeDatabase(db);
  setDatabase(await sqlite.openDatabase(dbPath));
}

export async function closeDatabase() {
  if (db) {
    await sqlite.closeDatabase(db);
    setDatabase(null);
  }
}

export function setDatabase(db_) {
  db = db_;
  resetQueryCache();
}

export function getDatabase() {
  return db;
}

export async function loadClock() {
  let row = await first('SELECT * FROM messages_clock');
  if (row) {
    let clock = deserializeClock(row.clock);
    setClock(clock);
  } else {
    // No clock exists yet (first run of the app), so create a default
    // one.
    let timestamp = new Timestamp(0, 0, makeClientId());
    let clock = makeClock(timestamp);
    setClock(clock);

    await runQuery('INSERT INTO messages_clock (id, clock) VALUES (?, ?)', [
      1,
      serializeClock(clock)
    ]);
  }
}

// Functions

export function runQuery(sql, params, fetchAll) {
  // const unrecord = perf.record('sqlite');
  const result = sqlite.runQuery(db, sql, params, fetchAll);
  // unrecord();
  return result;
}

export function execQuery(sql) {
  sqlite.execQuery(db, sql);
}

// This manages an LRU cache of prepared query statements. This is
// only needed in hot spots when you are running lots of queries.
let _queryCache = new LRU({ max: 100 });
export function cache(sql) {
  let cached = _queryCache.get(sql);
  if (cached) {
    return cached;
  }

  let prepared = sqlite.prepare(db, sql);
  _queryCache.set(sql, prepared);
  return prepared;
}

function resetQueryCache() {
  _queryCache = new LRU({ max: 100 });
}

export function transaction(fn) {
  return sqlite.transaction(db, fn);
}

export function asyncTransaction(fn) {
  return sqlite.asyncTransaction(db, fn);
}

// This function is marked as async because `runQuery` is no longer
// async. We return a promise here until we've audited all the code to
// make sure nothing calls `.then` on this.
export async function all(sql, params) {
  return runQuery(sql, params, true);
}

export async function first(sql, params) {
  const arr = await runQuery(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}

// The underlying sql system is now sync, but we can't update `first` yet
// without auditing all uses of it
export function firstSync(sql, params) {
  const arr = runQuery(sql, params, true);
  return arr.length === 0 ? null : arr[0];
}

// This function is marked as async because `runQuery` is no longer
// async. We return a promise here until we've audited all the code to
// make sure nothing calls `.then` on this.
export async function run(sql, params) {
  return runQuery(sql, params);
}

export async function select(table, id) {
  const rows = await runQuery(
    'SELECT * FROM ' + table + ' WHERE id = ?',
    [id],
    true
  );
  return rows[0];
}

export async function update(table, params) {
  let fields = Object.keys(params).filter(k => k !== 'id');

  if (params.id == null) {
    throw new Error('update: id is required');
  }

  await sendMessages(
    fields.map(k => {
      return {
        dataset: table,
        row: params.id,
        column: k,
        value: params[k],
        timestamp: Timestamp.send()
      };
    })
  );
}

export async function insertWithUUID(table, row) {
  if (!row.id) {
    row = { ...row, id: uuid.v4Sync() };
  }

  await insert(table, row);

  // We can't rely on the return value of insert because if the
  // primary key is text, sqlite returns the internal row id which we
  // don't care about. We want to return the generated UUID.
  return row.id;
}

export async function insert(table, row) {
  let fields = Object.keys(row).filter(k => k !== 'id');

  if (row.id == null) {
    throw new Error('insert: id is required');
  }

  await sendMessages(
    fields.map(k => {
      return {
        dataset: table,
        row: row.id,
        column: k,
        value: row[k],
        timestamp: Timestamp.send()
      };
    })
  );
}

export async function delete_(table, id) {
  await sendMessages([
    {
      dataset: table,
      row: id,
      column: 'tombstone',
      value: 1,
      timestamp: Timestamp.send()
    }
  ]);
}

export async function selectWithSchema(table, sql, params) {
  let rows = await runQuery(sql, params, true);
  return rows
    .map(row => convertFromSelect(schema, schemaConfig, table, row))
    .filter(Boolean);
}

export async function selectFirstWithSchema(table, sql, params) {
  let rows = await selectWithSchema(table, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function insertWithSchema(table, row) {
  // Even though `insertWithUUID` does this, we need to do it here so
  // the schema validation passes
  if (!row.id) {
    row = { ...row, id: uuid.v4Sync() };
  }

  return insertWithUUID(
    table,
    convertForInsert(schema, schemaConfig, table, row)
  );
}

export function updateWithSchema(table, fields) {
  return update(table, convertForUpdate(schema, schemaConfig, table, fields));
}

// Data-specific functions. Ideally this would be split up into
// different files

export async function getCategories() {
  return all(`
    SELECT c.* FROM categories c
      LEFT JOIN category_groups cg ON c.cat_group = cg.id
      WHERE c.tombstone = 0
      ORDER BY cg.sort_order, cg.id, c.sort_order, c.id
  `);
}

export async function getCategoriesGrouped() {
  const groups = await all(
    'SELECT * FROM category_groups WHERE tombstone = 0 ORDER BY is_income, sort_order, id'
  );
  const rows = await all(`
    SELECT * FROM categories WHERE tombstone = 0
      ORDER BY sort_order, id
  `);

  return groups.map(group => {
    return {
      ...group,
      categories: rows.filter(row => row.cat_group === group.id)
    };
  });
}

export async function insertCategoryGroup(group) {
  const lastGroup = await first(`
    SELECT sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
  `);
  const sort_order = (lastGroup ? lastGroup.sort_order : 0) + SORT_INCREMENT;

  group = {
    ...categoryGroupModel.validate(group),
    sort_order: sort_order
  };
  return insertWithUUID('category_groups', group);
}

export function updateCategoryGroup(group) {
  group = categoryGroupModel.validate(group, { update: true });
  return update('category_groups', group);
}

export async function moveCategoryGroup(id, targetId) {
  const groups = await all(
    `SELECT id, sort_order FROM category_groups WHERE tombstone = 0 ORDER BY sort_order, id`
  );

  const { updates, sort_order } = shoveSortOrders(groups, targetId);
  for (let info of updates) {
    await update('category_groups', info);
  }
  await update('category_groups', { id, sort_order });
}

export async function deleteCategoryGroup(group, transferId) {
  const categories = await all('SELECT * FROM categories WHERE cat_group = ?', [
    group.id
  ]);

  // Delete all the categories within a group
  await Promise.all(categories.map(cat => deleteCategory(cat, transferId)));
  await delete_('category_groups', group.id);
}

export async function insertCategory(category, { atEnd } = {}) {
  let sort_order;

  let id_;
  await batchMessages(async () => {
    if (atEnd) {
      const lastCat = await first(`
        SELECT sort_order FROM categories WHERE tombstone = 0 ORDER BY sort_order DESC, id DESC LIMIT 1
      `);
      sort_order = (lastCat ? lastCat.sort_order : 0) + SORT_INCREMENT;
    } else {
      // Unfortunately since we insert at the beginning, we need to shove
      // the sort orders to make sure there's room for it
      const categories = await all(
        `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
        [category.cat_group]
      );

      const { updates, sort_order: order } = shoveSortOrders(
        categories,
        categories.length > 0 ? categories[0].id : null
      );
      for (let info of updates) {
        await update('categories', info);
      }
      sort_order = order;
    }

    category = {
      ...categoryModel.validate(category),
      sort_order: sort_order
    };

    const id = await insertWithUUID('categories', category);
    // Create an entry in the mapping table that points it to itself
    await insert('category_mapping', { id, transferId: id });
    id_ = id;
  });
  return id_;
}

export function updateCategory(category) {
  category = categoryModel.validate(category, { update: true });
  return update('categories', category);
}

export async function moveCategory(id, groupId, targetId) {
  if (!groupId) {
    throw new Error('moveCategory: groupId is required');
  }

  const categories = await all(
    `SELECT id, sort_order FROM categories WHERE cat_group = ? AND tombstone = 0 ORDER BY sort_order, id`,
    [groupId]
  );

  const { updates, sort_order } = shoveSortOrders(categories, targetId);
  for (let info of updates) {
    await update('categories', info);
  }
  await update('categories', { id, sort_order, cat_group: groupId });
}

export async function deleteCategory(category, transferId) {
  if (transferId) {
    // We need to update all the deleted categories that currently
    // point to the one we're about to delete so they all are
    // "forwarded" to the new transferred category.
    const existingTransfers = await all(
      'SELECT * FROM category_mapping WHERE transferId = ?',
      [category.id]
    );
    for (let mapping of existingTransfers) {
      await update('category_mapping', { id: mapping.id, transferId });
    }

    // Finally, map the category we're about to delete to the new one
    await update('category_mapping', { id: category.id, transferId });
  }

  return delete_('categories', category.id);
}

export async function getPayee(id) {
  return first(`SELECT * FROM payees WHERE id = ?`, [id]);
}

export async function insertPayee(payee) {
  payee = payeeModel.validate(payee);
  let id;
  await batchMessages(async () => {
    id = await insertWithUUID('payees', payee);
    await insert('payee_mapping', { id, targetId: id });
  });
  return id;
}

export async function deletePayee(payee) {
  let { transfer_acct } = await first('SELECT * FROM payees WHERE id = ?', [
    payee.id
  ]);
  if (transfer_acct) {
    // You should never be able to delete transfer payees
    return;
  }

  // let mappings = await all('SELECT id FROM payee_mapping WHERE targetId = ?', [
  //   payee.id
  // ]);
  // await Promise.all(
  //   mappings.map(m => update('payee_mapping', { id: m.id, targetId: null }))
  // );

  let rules = await all('SELECT * FROM payee_rules WHERE payee_id = ?', [
    payee.id
  ]);
  await Promise.all(rules.map(rule => deletePayeeRule({ id: rule.id })));
  return delete_('payees', payee.id);
}

export async function deleteTransferPayee(payee) {
  // This allows deleting transfer payees
  return delete_('payees', payee.id);
}

export function updatePayee(payee) {
  payee = payeeModel.validate(payee, { update: true });
  return update('payees', payee);
}

export async function mergePayees(target, ids) {
  // Load in payees so we can check some stuff
  let payees = groupById(await all('SELECT * FROM payees'));

  // Filter out any transfer payees
  if (payees[target].transfer_acct != null) {
    return;
  }
  ids = ids.filter(id => payees[id].transfer_acct == null);

  await batchMessages(async () => {
    await Promise.all(
      ids.map(async id => {
        let mappings = await all(
          'SELECT id FROM payee_mapping WHERE targetId = ?',
          [id]
        );
        await Promise.all(
          mappings.map(m =>
            update('payee_mapping', { id: m.id, targetId: target })
          )
        );
      })
    );

    return Promise.all(
      ids.map(id =>
        Promise.all([
          update('payee_mapping', { id, targetId: target }),
          delete_('payees', id)
        ])
      )
    );
  });
}

export function getPayees() {
  return all(`
    SELECT p.*, COALESCE(a.name, p.name) AS name FROM payees p
    LEFT JOIN accounts a ON (p.transfer_acct = a.id AND a.tombstone = 0)
    WHERE p.tombstone = 0 AND (p.transfer_acct IS NULL OR a.id IS NOT NULL)
    ORDER BY p.transfer_acct IS NULL DESC, p.name COLLATE NOCASE
  `);
}

export async function getOrphanedPayees() {
  let rows = await all(`
    SELECT p.id FROM payees p
    LEFT JOIN payee_mapping pm ON pm.id = p.id
    LEFT JOIN v_transactions_internal_alive t ON t.payee = pm.targetId
    WHERE p.tombstone = 0 AND p.transfer_acct IS NULL AND t.id IS NULL
  `);
  return rows.map(row => row.id);
}

export async function getPayeeByName(name) {
  return first(`SELECT * FROM payees WHERE LOWER(name) = ? AND tombstone = 0`, [
    name.toLowerCase()
  ]);
}

export function insertPayeeRule(rule) {
  rule = payeeRuleModel.validate(rule);
  return insertWithUUID('payee_rules', rule);
}

export function deletePayeeRule(rule) {
  return delete_('payee_rules', rule.id);
}

export function updatePayeeRule(rule) {
  rule = payeeModel.validate(rule, { update: true });
  return update('payee_rules', rule);
}

export function getPayeeRules(id) {
  return all(
    `SELECT pr.* FROM payee_rules pr
     LEFT JOIN payee_mapping pm ON pm.id = pr.payee_id
     WHERE pm.targetId = ? AND pr.tombstone = 0`,
    [id]
  );
}

export function getAccounts() {
  return all(
    `SELECT a.*, b.name as bankName, b.id as bankId FROM accounts a
       LEFT JOIN banks b ON a.bank = b.id
       WHERE a.tombstone = 0
       ORDER BY sort_order, name`
  );
}

export async function insertAccount(account) {
  // Default to checking. Makes it a lot easier for tests and is
  // generally harmless.
  if (account.type === undefined) {
    account = { ...account, type: 'checking' };
  }

  const accounts = await all(
    'SELECT * FROM accounts WHERE offbudget = ? ORDER BY sort_order, name',
    [account.offbudget != null ? account.offbudget : 0]
  );

  // Don't pass a target in, it will default to appending at the end
  let { sort_order } = shoveSortOrders(accounts);

  account = accountModel.validate({ ...account, sort_order });
  return insertWithUUID('accounts', account);
}

export function updateAccount(account) {
  account = accountModel.validate(account, { update: true });
  return update('accounts', account);
}

export function deleteAccount(account) {
  return delete_('accounts', account.id);
}

export async function moveAccount(id, targetId) {
  let account = await first('SELECT * FROM accounts WHERE id = ?', [id]);
  let accounts;
  if (account.closed) {
    accounts = await all(
      `SELECT id, sort_order FROM accounts WHERE closed = 1 ORDER BY sort_order, name`
    );
  } else {
    accounts = await all(
      `SELECT id, sort_order FROM accounts WHERE tombstone = 0 AND offbudget = ? ORDER BY sort_order, name`,
      [account.offbudget]
    );
  }

  const { updates, sort_order } = shoveSortOrders(accounts, targetId);
  await batchMessages(() => {
    for (let info of updates) {
      update('accounts', info);
    }
    update('accounts', { id, sort_order });
  });
}

export async function getTransaction(id) {
  let rows = await selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE id = ?',
    [id]
  );
  return rows[0];
}

export async function getTransactionsByDate(
  accountId,
  startDate,
  endDate,
  options = {}
) {
  throw new Error('`getTransactionsByDate` is deprecated');
}

export async function getTransactions(accountId, arg2) {
  if (arg2 !== undefined) {
    throw new Error(
      '`getTransactions` was given a second argument, it now only takes a single argument `accountId`'
    );
  }

  return selectWithSchema(
    'transactions',
    'SELECT * FROM v_transactions WHERE account = ?',
    [accountId]
  );
}

export function insertTransaction(transaction) {
  return insertWithSchema('transactions', transaction);
}

export function updateTransaction(transaction) {
  return updateWithSchema('transactions', transaction);
}

export async function deleteTransaction(transaction) {
  return delete_('transactions', transaction.id);
}
