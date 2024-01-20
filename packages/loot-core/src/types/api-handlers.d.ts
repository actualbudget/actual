import { type ServerHandlers } from './server-handlers';

export interface ApiHandlers {
  'api/batch-budget-start': () => Promise<unknown>;

  'api/batch-budget-end': () => Promise<unknown>;

  'api/load-budget': (
    ...args: Parameters<ServerHandlers['load-budget']>
  ) => Promise<void>;

  'api/download-budget': (arg: { syncId; password }) => Promise<unknown>;

  'api/start-import': (arg: { budgetName }) => Promise<unknown>;

  'api/finish-import': () => Promise<unknown>;

  'api/abort-import': () => Promise<unknown>;

  'api/query': (arg: { query }) => Promise<unknown>;

  'api/budget-months': () => Promise<unknown>;

  'api/budget-month': (arg: { month }) => Promise<{
    month;
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
    month;
    categoryId;
    amount;
  }) => Promise<unknown>;

  'api/budget-set-carryover': (arg: {
    month;
    categoryId;
    flag;
  }) => Promise<unknown>;

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
    accountId;
    startDate;
    endDate;
  }) => Promise<unknown>;

  'api/transaction-update': (arg: { id; fields }) => Promise<unknown>;

  'api/transaction-delete': (arg: { id }) => Promise<unknown>;

  'api/sync': () => Promise<unknown>;

  'api/accounts-get': () => Promise<AccountEntity[]>;

  'api/account-create': (arg: { account; initialBalance? }) => Promise<string>;

  'api/account-update': (arg: { id; fields }) => Promise<unknown>;

  'api/account-close': (arg: {
    id;
    transferAccountId;
    transferCategoryId;
  }) => Promise<unknown>;

  'api/account-reopen': (arg: { id }) => Promise<unknown>;

  'api/account-delete': (arg: { id }) => Promise<unknown>;

  'api/categories-get': (arg: {
    grouped;
  }) => Promise<Array<CategoryGroupEntity> | Array<CategoryEntity>>;

  'api/category-group-create': (arg: { group }) => Promise<string>;

  'api/category-group-update': (arg: { id; fields }) => Promise<unknown>;

  'api/category-group-delete': (arg: {
    id;
    transferCategoryId;
  }) => Promise<unknown>;

  'api/category-create': (arg: { category }) => Promise<string>;

  'api/category-update': (arg: { id; fields }) => Promise<unknown>;

  'api/category-delete': (arg: { id; transferCategoryId }) => Promise<unknown>;

  'api/payees-get': () => Promise<PayeeEntity[]>;

  'api/payee-create': (arg: { payee }) => Promise<string>;

  'api/payee-update': (arg: { id; fields }) => Promise<unknown>;

  'api/payee-delete': (arg: { id }) => Promise<unknown>;
}
