import * as injected from './injected';

export { default as q } from './app/query';

function send(name, args) {
  return injected.send(name, args);
}

export async function runImport(name, func) {
  await send('api/start-import', { budgetName: name });
  try {
    await func();
  } catch (e) {
    await send('api/abort-import');
    throw e;
  }
  await send('api/finish-import');
}

export async function loadBudget(budgetId) {
  return send('api/load-budget', { id: budgetId });
}

export async function downloadBudget(syncId, { password } = {}) {
  return send('api/download-budget', { syncId, password });
}

export async function sync() {
  return send('api/sync');
}

export async function batchBudgetUpdates(func) {
  await send('api/batch-budget-start');
  try {
    await func();
  } finally {
    await send('api/batch-budget-end');
  }
}

export function runQuery(query) {
  return send('api/query', { query: query.serialize() });
}

export function getBudgetMonths() {
  return send('api/budget-months');
}

export function getBudgetMonth(month) {
  return send('api/budget-month', { month });
}

export function setBudgetAmount(month, categoryId, value) {
  return send('api/budget-set-amount', { month, categoryId, amount: value });
}

export function setBudgetCarryover(month, categoryId, flag) {
  return send('api/budget-set-carryover', { month, categoryId, flag });
}

export function addTransactions(accountId, transactions) {
  return send('api/transactions-add', { accountId, transactions });
}

export function importTransactions(accountId, transactions) {
  return send('api/transactions-import', { accountId, transactions });
}

export function getTransactions(accountId, startDate, endDate) {
  return send('api/transactions-get', { accountId, startDate, endDate });
}

export function filterTransactions(accountId, text) {
  return send('api/transactions-filter', { accountId, text });
}

export function updateTransaction(id, fields) {
  return send('api/transaction-update', { id, fields });
}

export function deleteTransaction(id) {
  return send('api/transaction-delete', { id });
}

export function getAccounts() {
  return send('api/accounts-get');
}

export function createAccount(account, initialBalance) {
  return send('api/account-create', { account, initialBalance });
}

export function updateAccount(id, fields) {
  return send('api/account-update', { id, fields });
}

export function closeAccount(id, transferAccountId, transferCategoryId) {
  return send('api/account-close', {
    id,
    transferAccountId,
    transferCategoryId,
  });
}

export function reopenAccount(id) {
  return send('api/account-reopen', { id });
}

export function deleteAccount(id) {
  return send('api/account-delete', { id });
}

export function createCategoryGroup(group) {
  return send('api/category-group-create', { group });
}

export function updateCategoryGroup(id, fields) {
  return send('api/category-group-update', { id, fields });
}

export function deleteCategoryGroup(id, transferCategoryId) {
  return send('api/category-group-delete', { id, transferCategoryId });
}

export function getCategories() {
  return send('api/categories-get', { grouped: false });
}

export function createCategory(category) {
  return send('api/category-create', { category });
}

export function updateCategory(id, fields) {
  return send('api/category-update', { id, fields });
}

export function deleteCategory(id, transferCategoryId) {
  return send('api/category-delete', { id, transferCategoryId });
}

export function getPayees() {
  return send('api/payees-get');
}

export function createPayee(payee) {
  return send('api/payee-create', { payee });
}

export function updatePayee(id, fields) {
  return send('api/payee-update', { id, fields });
}

export function deletePayee(id) {
  return send('api/payee-delete', { id });
}
