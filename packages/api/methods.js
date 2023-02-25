const q = require('./app/query');
const injected = require('./injected');

function send(name, args) {
  return injected.send(name, args);
}

async function runImport(name, func) {
  await send('api/start-import', { budgetName: name });
  try {
    await func();
  } catch (e) {
    await send('api/abort-import');
    throw e;
  }
  await send('api/finish-import');
}

async function loadBudget(budgetId) {
  return send('api/load-budget', { id: budgetId });
}

async function downloadBudget(syncId, { password } = {}) {
  return send('api/download-budget', { syncId, password });
}

async function batchBudgetUpdates(func) {
  await send('api/batch-budget-start');
  try {
    await func();
  } finally {
    await send('api/batch-budget-end');
  }
}

function runQuery(query) {
  return send('api/query', { query: query.serialize() });
}

function getBudgetMonths() {
  return send('api/budget-months');
}

function getBudgetMonth(month) {
  return send('api/budget-month', { month });
}

function setBudgetAmount(month, categoryId, value) {
  return send('api/budget-set-amount', { month, categoryId, amount: value });
}

function setBudgetCarryover(month, categoryId, flag) {
  return send('api/budget-set-carryover', { month, categoryId, flag });
}

function addTransactions(accountId, transactions) {
  return send('api/transactions-add', { accountId, transactions });
}

function importTransactions(accountId, transactions) {
  return send('api/transactions-import', { accountId, transactions });
}

function getTransactions(accountId, startDate, endDate) {
  return send('api/transactions-get', { accountId, startDate, endDate });
}

function filterTransactions(accountId, text) {
  return send('api/transactions-filter', { accountId, text });
}

function updateTransaction(id, fields) {
  return send('api/transaction-update', { id, fields });
}

function deleteTransaction(id) {
  return send('api/transaction-delete', { id });
}

function getAccounts() {
  return send('api/accounts-get');
}

function createAccount(account, initialBalance) {
  return send('api/account-create', { account, initialBalance });
}

function updateAccount(id, fields) {
  return send('api/account-update', { id, fields });
}

function closeAccount(id, transferAccountId, transferCategoryId) {
  return send('api/account-close', {
    id,
    transferAccountId,
    transferCategoryId,
  });
}

function reopenAccount(id) {
  return send('api/account-reopen', { id });
}

function deleteAccount(id) {
  return send('api/account-delete', { id });
}

function getCategoryGroups() {
  return send('api/categories-get', { grouped: true });
}

function createCategoryGroup(group) {
  return send('api/category-group-create', { group });
}

function updateCategoryGroup(id, fields) {
  return send('api/category-group-update', { id, fields });
}

function deleteCategoryGroup(id, transferCategoryId) {
  return send('api/category-group-delete', { id, transferCategoryId });
}

function getCategories() {
  return send('api/categories-get', { grouped: false });
}

function createCategory(category) {
  return send('api/category-create', { category });
}

function updateCategory(id, fields) {
  return send('api/category-update', { id, fields });
}

function deleteCategory(id, transferCategoryId) {
  return send('api/category-delete', { id, transferCategoryId });
}

function getPayees() {
  return send('api/payees-get');
}

function createPayee(payee) {
  return send('api/payee-create', { payee });
}

function updatePayee(id, fields) {
  return send('api/payee-update', { id, fields });
}

function deletePayee(id) {
  return send('api/payee-delete', { id });
}

function getPayeeRules(payeeId) {
  return send('api/payee-rules-get', { payeeId });
}

function createPayeeRule(payeeId, rule) {
  return send('api/payee-rule-create', { payee_id: payeeId, rule });
}

function updatePayeeRule(id, fields) {
  return send('api/payee-rule-update', { id, fields });
}

function deletePayeeRule(id) {
  return send('api/payee-rule-delete', { id });
}

module.exports = {
  runImport,

  runQuery,
  q,

  loadBudget,
  downloadBudget,
  batchBudgetUpdates,
  getBudgetMonths,
  getBudgetMonth,
  setBudgetAmount,
  setBudgetCarryover,

  addTransactions,
  importTransactions,
  filterTransactions,
  getTransactions,
  updateTransaction,
  deleteTransaction,

  getAccounts,
  createAccount,
  updateAccount,
  closeAccount,
  reopenAccount,
  deleteAccount,

  getCategories,
  createCategoryGroup,
  updateCategoryGroup,
  deleteCategoryGroup,
  createCategory,
  updateCategory,
  deleteCategory,

  getPayees,
  createPayee,
  updatePayee,
  deletePayee,
  getPayeeRules,
  createPayeeRule,
  deletePayeeRule,
  updatePayeeRule,
};
