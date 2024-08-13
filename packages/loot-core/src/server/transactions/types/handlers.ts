// @ts-strict-ignore
import { QueryState } from '../../../shared/query';
import {
  type TransactionEntity
} from '../../../types/models';
import { ParseFileResult } from '../../accounts/parse-file';

export interface TransactionsHandler {
  'transactions-batch-update': (arg: {
    added?: Partial<TransactionEntity>[];
    deleted?: Partial<TransactionEntity>[];
    updated?: Partial<TransactionEntity>[];
    learnCategories?: boolean;
  }) => Promise<object>;

  'transaction-add': (
    transaction: Partial<TransactionEntity>,
  ) => Promise<object>;

  'transaction-update': (
    transaction: Partial<TransactionEntity>,
  ) => Promise<object>;

  'transaction-delete': (
    transaction: Partial<TransactionEntity>,
  ) => Promise<object>;

  'transactions-parse-file': (arg: {
    filepath: string;
    options: object;
  }) => Promise<ParseFileResult>;

  'transactions-export': (arg: {
    transactions: Partial<TransactionEntity>[];
    accounts: unknown;
    categoryGroups: unknown;
    payees: unknown;
  }) => Promise<string>;

  'transactions-export-query': (arg: { query: QueryState }) => Promise<string>;

  'transactions-import': (arg: {
    accountId: string;
    transactions: Partial<TransactionEntity>[];
    isPreview: boolean;
  }) => Promise<object>;
}
