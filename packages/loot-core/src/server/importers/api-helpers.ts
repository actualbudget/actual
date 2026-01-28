// @ts-strict-ignore
// Local API helper module for importers
// This provides the same interface as @actual-app/api/methods but uses handlers directly
// to avoid cyclic dependency between loot-core and @actual-app/api

import { type Handlers } from '../../types/handlers';
import type { ImportTransactionEntity } from '../../types/models';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIPayeeEntity,
} from '../api-models';
import { app } from '../main-app';
import { runHandler } from '../mutators';

// Send function that calls handlers directly
export function send<K extends keyof Handlers>(
  name: K,
  args?: Parameters<Handlers[K]>[0],
): Promise<Awaited<ReturnType<Handlers[K]>>> {
  return runHandler(app.handlers[name], args) as Promise<
    Awaited<ReturnType<Handlers[K]>>
  >;
}

// API methods used by importers
export async function createAccount(
  account: Omit<APIAccountEntity, 'id'>,
  initialBalance?: number,
) {
  return send('api/account-create', { account, initialBalance });
}

export async function getAccounts() {
  return send('api/accounts-get');
}

export async function getCategories() {
  return send('api/categories-get', { grouped: false });
}

export async function createCategoryGroup(
  group: Omit<APICategoryGroupEntity, 'id'>,
) {
  return send('api/category-group-create', { group });
}

export async function createCategory(category: Omit<APICategoryEntity, 'id'>) {
  return send('api/category-create', { category });
}

export async function createPayee(payee: Omit<APIPayeeEntity, 'id'>) {
  return send('api/payee-create', { payee });
}

export async function getPayees() {
  return send('api/payees-get');
}

export async function addTransactions(
  accountId: APIAccountEntity['id'],
  transactions: Omit<ImportTransactionEntity, 'account'>[],
  {
    learnCategories = false,
    runTransfers = false,
  }: { learnCategories?: boolean; runTransfers?: boolean } = {},
) {
  return send('api/transactions-add', {
    accountId,
    transactions,
    learnCategories,
    runTransfers,
  });
}

export async function batchBudgetUpdates(func: () => Promise<void>) {
  await send('api/batch-budget-start');
  try {
    await func();
  } finally {
    await send('api/batch-budget-end');
  }
}

export async function setBudgetAmount(
  month: string,
  categoryId: APICategoryEntity['id'],
  value: number,
) {
  return send('api/budget-set-amount', { month, categoryId, amount: value });
}

export async function setBudgetCarryover(
  month: string,
  categoryId: APICategoryEntity['id'],
  flag: boolean,
) {
  return send('api/budget-set-carryover', { month, categoryId, flag });
}
