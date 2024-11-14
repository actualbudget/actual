import type { Handlers } from '../../types/handlers';
import { type TransactionEntity, type AccountEntity } from '../../types/models';
import type * as constants from '../constants';

export type QueriesState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
  updatedAccounts: Array<AccountEntity['id']>;
  accounts: AccountEntity[];
  accountsLoaded: boolean;
  categories: Awaited<ReturnType<Handlers['get-categories']>>;
  categoriesLoaded: boolean;
  commonPayeesLoaded: boolean;
  commonPayees: Awaited<ReturnType<Handlers['common-payees-get']>>;
  payees: Awaited<ReturnType<Handlers['payees-get']>>;
  payeesLoaded: boolean;
};

type SetNewTransactionsAction = {
  type: typeof constants.SET_NEW_TRANSACTIONS;
  newTransactions?: Array<TransactionEntity['id']>;
  matchedTransactions?: Array<TransactionEntity['id']>;
  updatedAccounts?: Array<AccountEntity['id']>;
};

type UpdateNewTransactionsAction = {
  type: typeof constants.UPDATE_NEW_TRANSACTIONS;
  changedId: string;
};

type SetLastTransactionAction = {
  type: typeof constants.SET_LAST_TRANSACTION;
  transaction: TransactionEntity;
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
  account: AccountEntity;
};

type LoadCategoriesAction = {
  type: typeof constants.LOAD_CATEGORIES;
  categories: State['categories'];
};

type LoadPayeesAction = {
  type: typeof constants.LOAD_PAYEES;
  payees: State['payees'];
};

type LoadCommonPayeesAction = {
  type: typeof constants.LOAD_COMMON_PAYEES;
  payees: State['common_payees'];
};

export type QueriesActions =
  | SetNewTransactionsAction
  | UpdateNewTransactionsAction
  | SetLastTransactionAction
  | MarkAccountReadAction
  | LoadAccountsAction
  | UpdateAccountAction
  | LoadCategoriesAction
  | LoadCommonPayeesAction
  | LoadPayeesAction;
