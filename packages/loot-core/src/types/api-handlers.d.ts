import { type batchUpdateTransactions } from '../server/accounts/transactions';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIFileEntity,
  APIPayeeEntity,
} from '../server/api-models';

import type { NewRuleEntity, RuleEntity, TransactionEntity } from './models';
import { type ServerHandlers } from './server-handlers';

export interface ApiHandlers {
  'api/batch-budget-start': () => Promise<unknown>;

  'api/batch-budget-end': () => Promise<unknown>;

  'api/load-budget': (
    ...args: Parameters<ServerHandlers['load-budget']>
  ) => Promise<void>;

  'api/download-budget': (arg: {
    syncId: string;
    password?: string;
  }) => Promise<void>;

  'api/get-budgets': () => Promise<APIFileEntity[]>;

  'api/start-import': (arg: { budgetName: string }) => Promise<void>;

  'api/finish-import': () => Promise<void>;

  'api/abort-import': () => Promise<void>;

  'api/query': (arg: { query }) => Promise<unknown>;

  'api/budget-months': () => Promise<string[]>;

  'api/budget-month': (arg: { month }) => Promise<{
    month: string;
    incomeAvailable: number;
    lastMonthOverspent: number;
    forNextMonth: number;
    totalBudgeted: number;
    toBudget: number;

    fromLastMonth: number;
    totalIncome: number;
    totalSpent: number;
    totalBalance: number;
    categoryGroups: Record<string, unknown>[];
  }>;

  'api/budget-set-amount': (arg: {
    month: string;
    categoryId: string;
    amount: number;
  }) => Promise<void>;

  'api/budget-set-carryover': (arg: {
    month: string;
    categoryId: string;
    flag: boolean;
  }) => Promise<void>;

  'api/budget-hold-for-next-month': (arg: {
    month: string;
    amount: number;
  }) => Promise<void>;

  'api/budget-reset-hold': (arg: { month: string }) => Promise<void>;

  'api/transactions-export': (arg: {
    transactions;
    categoryGroups;
    payees;
  }) => Promise<unknown>;

  'api/transactions-import': (arg: { accountId; transactions }) => Promise<{
    errors?: { message: string }[];
    added;
    updated;
  }>;

  'api/transactions-add': (arg: {
    accountId;
    transactions;
    runTransfers?: boolean;
    learnCategories?: boolean;
  }) => Promise<'ok'>;

  'api/transactions-get': (arg: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<TransactionEntity[]>;

  'api/transaction-update': (arg: {
    id;
    fields;
  }) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['updated']>;

  'api/transaction-delete': (arg: {
    id;
  }) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['updated']>;

  'api/sync': () => Promise<void>;

  'api/bank-sync': (arg?: { accountId: string }) => Promise<void>;

  'api/accounts-get': () => Promise<APIAccountEntity[]>;

  'api/account-create': (arg: { account; initialBalance? }) => Promise<string>;

  'api/account-update': (arg: { id; fields }) => Promise<void>;

  'api/account-close': (arg: {
    id;
    transferAccountId;
    transferCategoryId;
  }) => Promise<unknown>;

  'api/account-reopen': (arg: { id }) => Promise<unknown>;

  'api/account-delete': (arg: { id }) => Promise<unknown>;

  'api/account-balance': (arg: {
    id: string;
    cutoff?: Date;
  }) => Promise<number>;

  'api/categories-get': (arg: {
    grouped;
  }) => Promise<Array<APICategoryGroupEntity | APICategoryEntity>>;

  'api/category-groups-get': () => Promise<APICategoryGroupEntity[]>;

  'api/category-group-create': (arg: { group }) => Promise<string>;

  'api/category-group-update': (arg: { id; fields }) => Promise<unknown>;

  'api/category-group-delete': (arg: {
    id;
    transferCategoryId;
  }) => Promise<unknown>;

  'api/category-create': (arg: { category }) => Promise<string>;

  'api/category-update': (arg: { id; fields }) => Promise<unknown>;

  'api/category-delete': (arg: {
    id;
    transferCategoryId?;
  }) => Promise<{ error?: string }>;

  'api/payees-get': () => Promise<APIPayeeEntity[]>;

  'api/common-payees-get': () => Promise<APIPayeeEntity[]>;

  'api/payee-create': (arg: { payee }) => Promise<string>;

  'api/payee-update': (arg: { id; fields }) => Promise<unknown>;

  'api/payee-delete': (arg: { id }) => Promise<unknown>;

  'api/payees-merge': (arg: {
    targetId: string;
    mergeIds: string[];
  }) => Promise<void>;

  'api/rules-get': () => Promise<RuleEntity[]>;

  'api/payee-rules-get': (arg: { id: string }) => Promise<RuleEntity[]>;

  'api/rule-create': (arg: { rule: NewRuleEntity }) => Promise<RuleEntity>;

  'api/rule-update': (arg: { rule: RuleEntity }) => Promise<RuleEntity>;

  'api/rule-delete': (arg: { id: string }) => Promise<boolean>;
}
