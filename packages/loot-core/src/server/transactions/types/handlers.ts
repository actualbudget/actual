// @ts-strict-ignore
import { QueryState } from '../../../shared/query';
import { type TransactionEntity } from '../../../types/models';
import { ParseFileResult } from '../../accounts/parse-file';

export interface TransactionsHandler {
  'transactions-batch-update': (arg: {
    added?: TransactionEntity[];
    deleted?: TransactionEntity[];
    updated?: TransactionEntity[];
    learnCategories?: boolean;
  }) => Promise<object>;

  'transaction-add': (transaction: TransactionEntity) => Promise<object>;

  'transaction-update': (transaction: TransactionEntity) => Promise<object>;

  'transaction-delete': (transaction: TransactionEntity) => Promise<object>;

  'transactions-parse-file': (arg: {
    filepath: string;
    options: object;
  }) => Promise<ParseFileResult>;

  'transactions-export': (arg: {
    transactions: TransactionEntity[];
    accounts: unknown;
    categoryGroups: unknown;
    payees: unknown;
  }) => Promise<string>;

  'transactions-export-query': (arg: { query: QueryState }) => Promise<string>;

  'transactions-import': (arg: {
    accountId: string;
    transactions: TransactionEntity[];
    isPreview: boolean;
  }) => Promise<object>;
}
