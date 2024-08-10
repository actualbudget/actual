// @ts-strict-ignore
import { QueryState } from '../../../shared/query';
import {
  type TransactionEntity,
  NewTransactionEntity,
} from '../../../types/models';
import { ParseFileResult } from '../../accounts/parse-file';

export interface TransactionsHandler {
  'transactions-batch-update': (arg: {
    added?: Partial<TransactionEntity | NewTransactionEntity>[];
    deleted?: Partial<TransactionEntity | NewTransactionEntity>[];
    updated?: Partial<TransactionEntity | NewTransactionEntity>[];
    learnCategories?: boolean;
  }) => Promise<object>;

  'transaction-add': (
    transaction: Partial<TransactionEntity | NewTransactionEntity>,
  ) => Promise<object>;

  'transaction-update': (
    transaction: Partial<TransactionEntity | NewTransactionEntity>,
  ) => Promise<object>;

  'transaction-delete': (
    transaction: Partial<TransactionEntity | NewTransactionEntity>,
  ) => Promise<object>;

  'transactions-parse-file': (arg: {
    filepath: string;
    options: object;
  }) => Promise<ParseFileResult>;

  'transactions-export': (arg: {
    transactions: Partial<TransactionEntity | NewTransactionEntity>[];
    accounts: unknown;
    categoryGroups: unknown;
    payees: unknown;
  }) => Promise<string>;

  'transactions-export-query': (arg: { query: QueryState }) => Promise<string>;

  'transactions-import': (arg: {
    accountId: string;
    transactions: Partial<TransactionEntity | NewTransactionEntity>[];
    isPreview: boolean;
  }) => Promise<object>;
}
