// @ts-strict-ignore
import memoizeOne from 'memoize-one';

import { groupById } from '../../shared/util';
import { type AccountEntity, type PayeeEntity } from '../../types/models';
import * as constants from '../constants';
import type { Action } from '../state-types';
import type { QueriesState } from '../state-types/queries';

const initialState: QueriesState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
  updatedAccounts: [],
  accounts: [],
  accountsLoaded: false,
  categories: {
    grouped: [],
    list: [],
  },
  categoriesLoaded: false,
  commonPayees: [],
  commonPayeesLoaded: false,
  payees: [],
  payeesLoaded: false,
};

export function update(state = initialState, action: Action): QueriesState {
  switch (action.type) {
    case constants.SET_NEW_TRANSACTIONS:
      return {
        ...state,
        newTransactions: action.newTransactions
          ? [...state.newTransactions, ...action.newTransactions]
          : state.newTransactions,
        matchedTransactions: action.matchedTransactions
          ? [...state.matchedTransactions, ...action.matchedTransactions]
          : state.matchedTransactions,
        updatedAccounts: action.updatedAccounts
          ? [...state.updatedAccounts, ...action.updatedAccounts]
          : state.updatedAccounts,
      };
    case constants.UPDATE_NEW_TRANSACTIONS:
      return {
        ...state,
        newTransactions: state.newTransactions.filter(
          id => id !== action.changedId,
        ),
        matchedTransactions: state.matchedTransactions.filter(
          id => id !== action.changedId,
        ),
      };
    case constants.SET_LAST_TRANSACTION:
      return {
        ...state,
        lastTransaction: action.transaction,
      };
    case constants.MARK_ACCOUNT_READ:
      return {
        ...state,
        updatedAccounts: state.updatedAccounts.filter(
          id => id !== action.accountId,
        ),
      };
    case constants.LOAD_ACCOUNTS:
      return {
        ...state,
        accounts: action.accounts,
        accountsLoaded: true,
      };
    case constants.UPDATE_ACCOUNT: {
      return {
        ...state,
        accounts: state.accounts.map(account => {
          if (account.id === action.account.id) {
            return { ...account, ...action.account };
          }
          return account;
        }),
      };
    }
    case constants.LOAD_CATEGORIES:
      return {
        ...state,
        categories: action.categories,
        categoriesLoaded: true,
      };
    case constants.LOAD_COMMON_PAYEES:
      return {
        ...state,
        commonPayees: action.payees,
        commonPayeesLoaded: true,
      };
    case constants.LOAD_PAYEES:
      return {
        ...state,
        payees: action.payees,
        payeesLoaded: true,
      };
    default:
  }
  return state;
}

export const getAccountsById = memoizeOne((accounts: AccountEntity[]) =>
  groupById(accounts),
);
export const getPayeesById = memoizeOne((payees: PayeeEntity[]) =>
  groupById(payees),
);
export const getCategoriesById = memoizeOne(categoryGroups => {
  const res = {};
  categoryGroups.forEach(group => {
    group.categories.forEach(cat => {
      res[cat.id] = cat;
    });
  });
  return res;
});

export const getActivePayees = memoizeOne(
  (payees: PayeeEntity[], accounts: AccountEntity[]) => {
    const accountsById = getAccountsById(accounts);

    return payees.filter(payee => {
      if (payee.transfer_acct) {
        const account = accountsById[payee.transfer_acct];
        return account != null && !account.closed;
      }
      return true;
    });
  },
);
