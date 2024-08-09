// @ts-strict-ignore
import { ParseFileResult } from 'loot-core/server/accounts/parse-file';
import {
  type TransactionEntity,
  NewTransactionEntity,
} from '../../../types/models';
import { QueryState } from 'loot-core/shared/query';

export interface TransactionsHandler {
  'transactions-batch-update': (arg: {
    added: Partial<TransactionEntity | NewTransactionEntity>[],
    deleted: Partial<TransactionEntity | NewTransactionEntity>[],
    updated: Partial<TransactionEntity | NewTransactionEntity>[],
    learnCategories: boolean
  }) => Promise<object>;

  'transaction-add': (transaction: any) => Promise<object>;

  'transaction-update': (transaction: any) => Promise<object>;

  'transaction-delete': (transaction: any) => Promise<object>;

  'transactions-parse-file': (arg: {
    filepath: string,
    options: any,
  }) => Promise<ParseFileResult>;

  'transactions-export': (arg: {
    transactions: any,
    accounts: any,
    categoryGroups: any,
    payees: any,
  }) => Promise<any>;

  'transactions-export-query': (arg: {
    query: QueryState
  }) => Promise<any>;

  'transactions-import': (arg: {
    accountId: any,
    transactions: any,
    isPreview: any,
  }) => Promise<any>;
}
