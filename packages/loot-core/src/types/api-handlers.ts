// @ts-strict-ignore
import type {
  ImportTransactionsResult,
  SyncResponse,
} from '#server/accounts/app';
import type { PayeeNameNormalization } from '#server/accounts/sync';
import type {
  AmountFormatOptions,
  AmountInput,
  APIAccountCreateEntity,
  APIAccountEntity,
  APIAccountGroupEntity,
  APIAccountUpdateFields,
  APIBudgetMonth,
  APICategoryEntity,
  APICategoryGroupEntity,
  APIFileEntity,
  APIImportTransactionInput,
  APIMoneyTransactionEntity,
  APIPayeeEntity,
  APIRuleEntity,
  APIScheduleEntity,
  APITagEntity,
  APITransactionUpdateFields,
} from '#server/api-models';
import type { BudgetFileHandlers } from '#server/budgetfiles/app';
import type { batchUpdateTransactions } from '#server/transactions';
import type { Money } from '#shared/money';
import type { QueryState } from '#shared/query';

import type {
  AccountEntity,
  CategoryGroupEntity,
  NearbyPayeeEntity,
  NoteEntity,
  PayeeEntity,
  PayeeLocationEntity,
  RuleEntity,
  ScheduleEntity,
  TransactionEntity,
} from './models';

export type ImportTransactionsOpts = {
  defaultCleared?: boolean;
  dryRun?: boolean;
  reimportDeleted?: boolean;
  payeeNameNormalization?: PayeeNameNormalization;
};

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

  'api/start-import': (arg: {
    budgetName: string;
    currencyCode?: string;
  }) => Promise<void>;

  'api/finish-import': () => Promise<void>;

  'api/abort-import': () => Promise<void>;

  'api/query': (arg: { query: QueryState }) => Promise<unknown>;

  'api/budget-months': () => Promise<string[]>;

  'api/budget-month': (arg: {
    month: string;
    options?: AmountFormatOptions;
  }) => Promise<APIBudgetMonth<number | Money>>;

  'api/budget-set-amount': (arg: {
    month: string;
    categoryId: string;
    amount: AmountInput;
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
    transactions: TransactionEntity[];
    categoryGroups: CategoryGroupEntity[];
    payees: PayeeEntity[];
    accounts: AccountEntity[];
  }) => Promise<unknown>;

  'api/transactions-import': (arg: {
    accountId: APIAccountEntity['id'];
    transactions: APIImportTransactionInput[];
    isPreview?: boolean;
    opts?: ImportTransactionsOpts;
  }) => Promise<ImportTransactionsResult>;

  'api/transactions-add': (arg: {
    accountId: APIAccountEntity['id'];
    transactions: Omit<APIImportTransactionInput, 'account'>[];
    runTransfers?: boolean;
    learnCategories?: boolean;
  }) => Promise<'ok'>;

  'api/transactions-get': (arg: {
    accountId?: APIAccountEntity['id'];
    startDate?: string;
    endDate?: string;
    options?: AmountFormatOptions;
  }) => Promise<TransactionEntity[] | APIMoneyTransactionEntity[]>;

  'api/transaction-update': (arg: {
    id: TransactionEntity['id'];
    fields: APITransactionUpdateFields;
  }) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['updated']>;

  'api/transaction-delete': (arg: {
    id: TransactionEntity['id'];
  }) => Promise<Awaited<ReturnType<typeof batchUpdateTransactions>>['deleted']>;

  'api/transactions-merge': (arg: {
    ids: [TransactionEntity['id'], TransactionEntity['id']];
  }) => Promise<TransactionEntity['id']>;

  'api/sync': () => Promise<void>;

  'api/bank-sync': (arg?: {
    accountId: APIAccountEntity['id'];
  }) => Promise<SyncResponse>;

  'api/accounts-get': () => Promise<APIAccountEntity[]>;

  'api/account-create': (arg: {
    account: APIAccountCreateEntity;
    initialBalance?: AmountInput;
  }) => Promise<string>;

  'api/account-update': (arg: {
    id: APIAccountEntity['id'];
    fields: APIAccountUpdateFields;
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
    options?: AmountFormatOptions;
  }) => Promise<number | Money>;

  'api/account-groups-get': () => Promise<APIAccountGroupEntity[]>;

  'api/account-group-create': (arg: {
    group: Omit<APIAccountGroupEntity, 'id'>;
  }) => Promise<APIAccountGroupEntity['id']>;

  'api/account-group-update': (arg: {
    id: APIAccountGroupEntity['id'];
    fields: Partial<Omit<APIAccountGroupEntity, 'id'>>;
  }) => Promise<void>;

  'api/account-group-delete': (arg: {
    id: APIAccountGroupEntity['id'];
  }) => Promise<void>;

  'api/categories-get': (arg: {
    hidden?: boolean;
  }) => Promise<APICategoryEntity[]>;

  'api/category-groups-get': (arg?: {
    hidden?: boolean;
  }) => Promise<APICategoryGroupEntity[]>;

  'api/category-group-create': (arg: {
    group: Omit<APICategoryGroupEntity, 'id'>;
  }) => Promise<APICategoryGroupEntity['id']>;

  'api/category-group-update': (arg: {
    id: APICategoryGroupEntity['id'];
    fields: Partial<APICategoryGroupEntity>;
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
    fields: Partial<APICategoryEntity>;
  }) => Promise<void>;

  'api/category-delete': (arg: {
    id: APICategoryEntity['id'];
    transferCategoryId?: APICategoryEntity['id'];
  }) => Promise<void>;

  'api/note-get': (arg: Pick<NoteEntity, 'id'>) => Promise<NoteEntity | null>;

  'api/note-update': (arg: NoteEntity) => Promise<void>;

  'api/payees-get': () => Promise<APIPayeeEntity[]>;

  'api/common-payees-get': () => Promise<APIPayeeEntity[]>;

  'api/payee-create': (arg: {
    payee: Omit<APIPayeeEntity, 'id'>;
  }) => Promise<APIPayeeEntity['id']>;

  'api/payee-update': (arg: {
    id: APIPayeeEntity['id'];
    fields: Partial<APIPayeeEntity>;
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

  'api/payee-location-create': (arg: {
    payeeId: string;
    latitude: number;
    longitude: number;
  }) => Promise<string>;

  'api/payee-locations-get': (arg: {
    payeeId: string;
  }) => Promise<PayeeLocationEntity[]>;

  'api/payee-location-delete': (arg: { id: string }) => Promise<void>;

  'api/payees-get-nearby': (arg: {
    latitude: number;
    longitude: number;
    maxDistance?: number;
  }) => Promise<NearbyPayeeEntity[]>;

  'api/rules-get': () => Promise<RuleEntity[]>;

  'api/payee-rules-get': (arg: {
    id: APIPayeeEntity['id'];
  }) => Promise<RuleEntity[]>;

  'api/rule-create': (arg: {
    rule: Omit<APIRuleEntity, 'id'>;
  }) => Promise<RuleEntity>;

  'api/rule-update': (arg: { rule: APIRuleEntity }) => Promise<RuleEntity>;

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

  'api/schedule-dates-get': (arg: {
    date: APIScheduleEntity['date'];
    start?: string;
    end?: string;
    count?: number;
  }) => Promise<string[]>;

  'api/get-id-by-name': (arg: {
    type: string;
    name: string;
  }) => Promise<string>;
  'api/get-server-version': () => Promise<
    { error: 'no-server' } | { error: 'network-failure' } | { version: string }
  >;
};
