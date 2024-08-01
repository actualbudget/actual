// @ts-strict-ignore
import type { Handlers } from 'loot-core/src/types/handlers';

import * as injected from './injected';

export { q } from './app/query';

function send<K extends keyof Handlers, T extends Handlers[K]>(
  name: K,
  args?: Parameters<T>[0],
): Promise<Awaited<ReturnType<T>>> {
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

export async function downloadBudget(syncId, { password }: { password? } = {}) {
  return send('api/download-budget', { syncId, password });
}

export async function getBudgets() {
  return send('api/get-budgets');
}

export async function sync() {
  return send('api/sync');
}

export async function runBankSync(args?: { accountId: string }) {
  return send('api/bank-sync', args);
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

export function addTransactions(
  accountId,
  transactions,
  { learnCategories = false, runTransfers = false } = {},
) {
  return send('api/transactions-add', {
    accountId,
    transactions,
    learnCategories,
    runTransfers,
  });
}

export function importTransactions(accountId, transactions) {
  return send('api/transactions-import', { accountId, transactions });
}

export function getTransactions(accountId, startDate, endDate) {
  return send('api/transactions-get', { accountId, startDate, endDate });
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

export function createAccount(account, initialBalance?) {
  return send('api/account-create', { account, initialBalance });
}

export function updateAccount(id, fields) {
  return send('api/account-update', { id, fields });
}

export function closeAccount(id, transferAccountId?, transferCategoryId?) {
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

export function getAccountBalance(id, cutoff?) {
  return send('api/account-balance', { id, cutoff });
}

export function getCategoryGroups() {
  return send('api/category-groups-get');
}

export function createCategoryGroup(group) {
  return send('api/category-group-create', { group });
}

export function updateCategoryGroup(id, fields) {
  return send('api/category-group-update', { id, fields });
}

export function deleteCategoryGroup(id, transferCategoryId?) {
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

export function deleteCategory(id, transferCategoryId?) {
  return send('api/category-delete', { id, transferCategoryId });
}

export function getCommonPayees() {
  return send('api/common-payees-get');
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

export function mergePayees(targetId, mergeIds) {
  return send('api/payees-merge', { targetId, mergeIds });
}

export function getRules() {
  return send('api/rules-get');
}

export function getPayeeRules(id) {
  return send('api/payee-rules-get', { id });
}

export function createRule(rule) {
  return send('api/rule-create', { rule });
}

export function updateRule(rule) {
  return send('api/rule-update', { rule });
}

export function deleteRule(id) {
  return send('api/rule-delete', { id });
}

export function holdBudgetForNextMonth(month, amount) {
  return send('api/budget-hold-for-next-month', { month, amount });
}

export function resetBudgetHold(month) {
  return send('api/budget-reset-hold', { month });
}
