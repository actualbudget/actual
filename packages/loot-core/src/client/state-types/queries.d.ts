import type { Handlers } from '../../types/handlers';
import type * as constants from '../constants';

export type QueriesState = {
  newTransactions: unknown[];
  matchedTransactions: unknown[];
  lastTransaction: unknown | null;
  updatedAccounts: string[];
  accounts: AccountEntity[];
  categories: Awaited<ReturnType<Handlers['get-categories']>>;
  payees: unknown[];
  earliestTransaction: unknown | null;
};

type SetNewTransactionsAction = {
  type: typeof constants.SET_NEW_TRANSACTIONS;
  newTransactions?: unknown[];
  matchedTransactions?: unknown[];
  updatedAccounts?: string[];
};

type UpdateNewTransactionsAction = {
  type: typeof constants.UPDATE_NEW_TRANSACTIONS;
  changedId: string;
};

type SetLastTransactionAction = {
  type: typeof constants.SET_LAST_TRANSACTION;
  transaction: unknown;
};

type MarkAccountReadAction = {
  type: typeof constants.MARK_ACCOUNT_READ;
  accountId: string;
};

type LoadAccountsAction = {
  type: typeof constants.LOAD_ACCOUNTS;
  accounts: AccountEntity[];
};

type UpdateAccountAction = {
  type: typeof constants.UPDATE_ACCOUNT;
  account: unknown;
};

type LoadCategoriesAction = {
  type: typeof constants.LOAD_CATEGORIES;
  categories: State['categories'];
};

type LoadPayeesAction = {
  type: typeof constants.LOAD_PAYEES;
  payees: unknown[];
};

export type QueriesActions =
  | SetNewTransactionsAction
  | UpdateNewTransactionsAction
  | SetLastTransactionAction
  | MarkAccountReadAction
  | LoadAccountsAction
  | UpdateAccountAction
  | LoadCategoriesAction
  | LoadPayeesAction;
