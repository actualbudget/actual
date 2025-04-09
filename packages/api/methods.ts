// @ts-strict-ignore
import {
  APIAccountEntity,
  APIAddTransactionEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  NoId,
  RequireOnly,
} from 'loot-core/server/api-models';
import { Query } from 'loot-core/shared/query';
import type { Handlers } from 'loot-core/types/handlers';
import {
  RuleConditionEntity,
  RuleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import * as injected from './injected';

export { q } from './app/query';

function send<K extends keyof Handlers, T extends Handlers[K]>(
  name: K,
  args?: Parameters<T>[0],
): Promise<Awaited<ReturnType<T>>> {
  return injected.send(name, args);
}

export async function runImport(
  budgetName: string,
  func: (() => void) | (() => Promise<void>),
) {
  await send('api/start-import', { budgetName });
  try {
    await func();
  } catch (e) {
    await send('api/abort-import');
    throw e;
  }
  await send('api/finish-import');
}

export async function loadBudget(budgetId: string) {
  return send('api/load-budget', { id: budgetId });
}

export async function downloadBudget(
  syncId: string,
  { password }: { password? } = {},
) {
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

export async function batchBudgetUpdates(
  func: (() => void) | (() => Promise<void>),
) {
  await send('api/batch-budget-start');
  try {
    await func();
  } finally {
    await send('api/batch-budget-end');
  }
}

export function runQuery(query: Query) {
  return send('api/query', { query: query.serialize() });
}

export function getBudgetMonths() {
  return send('api/budget-months');
}

export function getBudgetMonth(month: string) {
  return send('api/budget-month', { month });
}

export function setBudgetAmount(
  month: string,
  categoryId?: APICategoryEntity['id'],
  value?: number,
) {
  return send('api/budget-set-amount', { month, categoryId, amount: value });
}

export function setBudgetCarryover(
  month: string,
  categoryId?: APICategoryEntity['id'],
  flag?: boolean,
) {
  return send('api/budget-set-carryover', { month, categoryId, flag });
}

export function addTransactions(
  accountId: APIAccountEntity['id'],
  transactions: APIAddTransactionEntity[],
  { learnCategories = false, runTransfers = false } = {},
) {
  return send('api/transactions-add', {
    accountId,
    transactions,
    learnCategories,
    runTransfers,
  });
}

export interface ImportTransactionsOpts {
  defaultCleared?: boolean;
}

export function importTransactions(
  accountId: APIAccountEntity['id'],
  transactions: APIAddTransactionEntity[],
  opts: ImportTransactionsOpts = {
    defaultCleared: true,
  },
) {
  return send('api/transactions-import', {
    accountId,
    transactions,
    opts,
  });
}

export function getTransactions(
  accountId: APIAccountEntity['id'],
  startDate?: string,
  endDate?: string,
) {
  return send('api/transactions-get', { accountId, startDate, endDate });
}

export function updateTransaction(
  id: TransactionEntity['id'],
  fields: Partial<NoId<TransactionEntity>>,
) {
  return send('api/transaction-update', { id, fields });
}

export function deleteTransaction(id: TransactionEntity['id']) {
  return send('api/transaction-delete', { id });
}

export function getAccounts() {
  return send('api/accounts-get');
}

export function createAccount(
  account: RequireOnly<APIAccountEntity, 'name'>,
  initialBalance?: number,
) {
  return send('api/account-create', { account, initialBalance });
}

export function updateAccount(
  id: APIAccountEntity['id'],
  fields: Partial<NoId<APIAccountEntity>>,
) {
  return send('api/account-update', { id, fields });
}

export function closeAccount(
  id: APIAccountEntity['id'],
  transferAccountId?: APIAccountEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/account-close', {
    id,
    transferAccountId,
    transferCategoryId,
  });
}

export function reopenAccount(id: APIAccountEntity['id']) {
  return send('api/account-reopen', { id });
}

export function deleteAccount(id: APIAccountEntity['id']) {
  return send('api/account-delete', { id });
}

export function getAccountBalance(id: APIAccountEntity['id'], cutoff?: Date) {
  return send('api/account-balance', { id, cutoff });
}

export function getCategoryGroups() {
  return send('api/category-groups-get');
}

export function createCategoryGroup(
  group: RequireOnly<APICategoryGroupEntity, 'name'>,
) {
  return send('api/category-group-create', { group });
}

export function updateCategoryGroup(
  id: APICategoryGroupEntity['id'],
  fields: Partial<NoId<APICategoryEntity>>,
) {
  return send('api/category-group-update', { id, fields });
}

export function deleteCategoryGroup(
  id: APICategoryGroupEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/category-group-delete', { id, transferCategoryId });
}

export function getCategories() {
  return send('api/categories-get', { grouped: false });
}

export function createCategory(
  category: RequireOnly<APICategoryEntity, 'name' | 'group_id'>,
) {
  return send('api/category-create', { category });
}

export function updateCategory(
  id: APICategoryEntity['id'],
  fields: NoId<APICategoryEntity>,
) {
  return send('api/category-update', { id, fields });
}

export function deleteCategory(
  id: APICategoryEntity['id'],
  transferCategoryId?: APICategoryEntity['id'],
) {
  return send('api/category-delete', { id, transferCategoryId });
}

export function getCommonPayees() {
  return send('api/common-payees-get');
}

export function getPayees() {
  return send('api/payees-get');
}

export function createPayee(payee: Pick<APIPayeeEntity, 'name'>) {
  return send('api/payee-create', { payee });
}

export function updatePayee(
  id: APIPayeeEntity['id'],
  fields: NoId<APIPayeeEntity>,
) {
  return send('api/payee-update', { id, fields });
}

export function deletePayee(id: APIPayeeEntity['id']) {
  return send('api/payee-delete', { id });
}

export function mergePayees(
  targetId: APIPayeeEntity['id'],
  mergeIds: APIPayeeEntity['id'][],
) {
  return send('api/payees-merge', { targetId, mergeIds });
}

export function getRules() {
  return send('api/rules-get');
}

export function getPayeeRules(id: APIPayeeEntity['id']) {
  return send('api/payee-rules-get', { id });
}

export function createRule(rule: NoId<RuleEntity>) {
  return send('api/rule-create', { rule });
}

export function updateRule(rule: RuleEntity) {
  return send('api/rule-update', { rule });
}

export function deleteRule(id: RuleEntity['id']) {
  return send('api/rule-delete', id);
}

export function holdBudgetForNextMonth(month: string, amount: number) {
  return send('api/budget-hold-for-next-month', { month, amount });
}

export function resetBudgetHold(month: string) {
  return send('api/budget-reset-hold', { month });
}

export function createSchedule(
  schedule: APIScheduleEntity,
  conditions?: RuleConditionEntity[],
) {
  return send('api/schedule-create', { schedule, conditions });
}

export function updateSchedule(
  id: APIScheduleEntity['id'],
  {
    conditions,
    fields,
  }: {
    conditions?: RuleConditionEntity[];
    fields?: NoId<APIScheduleEntity>;
  },
) {
  return send('api/schedule-update', { id, conditions, fields });
}

export function deleteSchedule(id: APIScheduleEntity['id']) {
  return send('api/schedule-delete', { id });
}
