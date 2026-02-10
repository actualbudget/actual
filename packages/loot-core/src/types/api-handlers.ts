// @ts-strict-ignore
import type { ImportTransactionsOpts } from '@actual-app/api';

import type { ImportTransactionsResult } from '../server/accounts/app';
import type {
  APIAccountEntity,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIFileEntity,
  APIPayeeEntity,
  APIScheduleEntity,
  APITagEntity,
} from '../server/api-models';
import type { BudgetFileHandlers } from '../server/budgetfiles/app';
import type { batchUpdateTransactions } from '../server/transactions';
import type { QueryState } from '../shared/query';

import type {
  ImportTransactionEntity,
  NewRuleEntity,
  RuleEntity,
  ScheduleEntity,
  TransactionEntity,
} from './models';

export type ApiHandlers = {
  'api/batch-budget-start': () => Promise<void>;

  'api/batch-budget-end': () => Promise<void>;

  'api/load-budget': (
    ...args: Parameters<BudgetFileHandlers['load-budget']>
  ) => Promise<void>;

  'api/download-budget': (arg: {
    syncId: string;
    password?: string;
  }) => Promise<void>;

  'api/get-budgets': () => Promise<APIFileEntity[]>;

  'api/start-import': (arg: { budgetName: string }) => Promise<void>;

  'api/finish-import': () => Promise<void>;

  'api/abort-import': () => Promise<void>;

  'api/query': (arg: { query: QueryState }) => Promise<unknown>;

  'api/budget-months': () => Promise<string[]>;

  'api/budget-month': (arg: { month: string }) => Promise<{
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
  }) => Promise<boolean>;

  'api/budget-reset-hold': (arg: { month: string }) => Promise<void>;

  'api/transactions-export': (arg: {
    transactions;
    categoryGroups;
    payees;
    accounts;
  }) => Promise<unknown>;

  'api/transactions-import': (arg: {
    accountId: APIAccountEntity['id'];
    transactions: ImportTransactionEntity[];
    isPreview?: boolean;
    opts?: ImportTransactionsOpts;
  }) => Promise<ImportTransactionsResult>;

  'api/transactions-add': (arg: {
    accountId: APIAccountEntity['id'];
    transactions: Omit<ImportTransactionEntity, 'account'>[];
    runTransfers?: boolean;
    learnCategories?: boolean;
  }) => Promise<'ok'>;

  'api/transactions-get': (arg: {
    accountId?: APIAccountEntity['id'];
    startDate?: string;
    endDate?: string;
  }) => Promise<TransactionEntity[]>;

  'api/transaction-update': (arg: {
    id: TransactionEntity['id'];
    fields;
    // TODO: fix me
    // fields: Partial<TransactionEntity>;
  }) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['updated']>;

  'api/transaction-delete': (arg: {
    id: TransactionEntity['id'];
  }) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['deleted']>;

  'api/sync': () => Promise<void>;

  'api/bank-sync': (arg?: {
    accountId: APIAccountEntity['id'];
  }) => Promise<void>;

  'api/accounts-get': () => Promise<APIAccountEntity[]>;

  'api/account-create': (arg: {
    account: Omit<APIAccountEntity, 'id'>;
    initialBalance?: number;
  }) => Promise<string>;

  'api/account-update': (arg: {
    id: APIAccountEntity['id'];
    fields;
    // TODO: fix me
    // fields: Partial<APIAccountEntity>;
  }) => Promise<void>;

  'api/account-close': (arg: {
    id: APIAccountEntity['id'];
    transferAccountId?: APIAccountEntity['id'];
    transferCategoryId?: APICategoryEntity['id'];
  }) => Promise<void>;

  'api/account-reopen': (arg: { id: APIAccountEntity['id'] }) => Promise<void>;

  'api/account-delete': (arg: { id: APIAccountEntity['id'] }) => Promise<void>;

  'api/account-balance': (arg: {
    id: APIAccountEntity['id'];
    cutoff?: Date;
  }) => Promise<number>;

  'api/categories-get': (arg: {
    grouped?: boolean;
  }) => Promise<Array<APICategoryGroupEntity | APICategoryEntity>>;

  'api/category-groups-get': () => Promise<APICategoryGroupEntity[]>;

  'api/category-group-create': (arg: {
    group: Omit<APICategoryGroupEntity, 'id'>;
  }) => Promise<APICategoryGroupEntity['id']>;

  'api/category-group-update': (arg: {
    id: APICategoryGroupEntity['id'];
    fields;
    // TODO: fix me
    // fields: Partial<APICategoryGroupEntity>;
  }) => Promise<void>;

  'api/category-group-delete': (arg: {
    id: APICategoryGroupEntity['id'];
    transferCategoryId?: APICategoryEntity['id'];
  }) => Promise<void>;

  'api/category-create': (arg: {
    category: Omit<APICategoryEntity, 'id'>;
  }) => Promise<APICategoryEntity['id']>;

  'api/category-update': (arg: {
    id: APICategoryEntity['id'];
    fields;
    // TODO: fix me
    // fields: Partial<APICategoryEntity>;
  }) => Promise<{ error: { type: 'category-exists' } } | object>;

  'api/category-delete': (arg: {
    id: APICategoryEntity['id'];
    transferCategoryId?: APICategoryEntity['id'];
  }) => Promise<
    { error: 'no-categories' } | { error: 'category-type' } | object
  >;

  'api/payees-get': () => Promise<APIPayeeEntity[]>;

  'api/common-payees-get': () => Promise<APIPayeeEntity[]>;

  'api/payee-create': (arg: {
    payee: Omit<APIPayeeEntity, 'id'>;
  }) => Promise<APIPayeeEntity['id']>;

  'api/payee-update': (arg: {
    id: APIPayeeEntity['id'];
    fields;
    // TODO: fix me
    // fields: Partial<APIPayeeEntity>;
  }) => Promise<void>;

  'api/payee-delete': (arg: { id: APIPayeeEntity['id'] }) => Promise<void>;

  'api/payees-merge': (arg: {
    targetId: APIPayeeEntity['id'];
    mergeIds: string[];
  }) => Promise<void>;

  'api/tags-get': () => Promise<APITagEntity[]>;

  'api/tag-create': (arg: {
    tag: Omit<APITagEntity, 'id'>;
  }) => Promise<APITagEntity['id']>;

  'api/tag-update': (arg: {
    id: APITagEntity['id'];
    fields: Partial<Omit<APITagEntity, 'id'>>;
  }) => Promise<void>;

  'api/tag-delete': (arg: { id: APITagEntity['id'] }) => Promise<void>;

  'api/rules-get': () => Promise<RuleEntity[]>;

  'api/payee-rules-get': (arg: {
    id: APIPayeeEntity['id'];
  }) => Promise<RuleEntity[]>;

  'api/rule-create': (arg: { rule: NewRuleEntity }) => Promise<RuleEntity>;

  'api/rule-update': (arg: { rule: RuleEntity }) => Promise<RuleEntity>;

  'api/rule-delete': (id: RuleEntity['id']) => Promise<boolean>;

  'api/schedule-create': (
    schedule: Omit<APIScheduleEntity, 'id'>,
  ) => Promise<ScheduleEntity['id']>;

  'api/schedule-update': (arg: {
    id: ScheduleEntity['id'];
    fields: Partial<APIScheduleEntity>;
    resetNextDate?: boolean;
  }) => Promise<ScheduleEntity['id']>;

  'api/schedule-delete': (id: string) => Promise<void>;

  'api/schedules-get': () => Promise<APIScheduleEntity[]>;
  'api/get-id-by-name': (arg: {
    type: string;
    name: string;
  }) => Promise<string>;
  'api/get-server-version': () => Promise<
    { error: 'no-server' } | { error: 'network-failure' } | { version: string }
  >;
};
