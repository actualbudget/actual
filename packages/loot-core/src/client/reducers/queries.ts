import memoizeOne from 'memoize-one';

import { groupById } from '../../shared/util';
import * as constants from '../constants';
import type { Action } from '../state-types';
import type { QueriesState } from '../state-types/queries';

const initialState: QueriesState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
  updatedAccounts: [],
  accounts: [],
  categories: {
    grouped: [],
    list: [],
  },
  payees: [],
  earliestTransaction: null,
};

export default function update(
  state = initialState,
  action: Action,
): QueriesState {
  switch (action.type) {
    case constants.SET_NEW_TRANSACTIONS:
      return {
        ...state,
        newTransactions: action.newTransactions || [],
        matchedTransactions: action.matchedTransactions || [],
        updatedAccounts: action.updatedAccounts || [],
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
      };
    case constants.UPDATE_ACCOUNT: {
      return {
        ...state,
        accounts: state.accounts.map(account => {
          // @ts-expect-error Not typed yet
          if (account.id === action.account.id) {
            // @ts-expect-error Not typed yet
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
      };
    case constants.LOAD_PAYEES:
      return {
        ...state,
        payees: action.payees,
      };
    default:
  }
  return state;
}

export const getAccountsById = memoizeOne(accounts => groupById(accounts));
export const getPayeesById = memoizeOne(payees => groupById(payees));
export const getCategoriesById = memoizeOne(categoryGroups => {
  let res = {};
  categoryGroups.forEach(group => {
    group.categories.forEach(cat => {
      res[cat.id] = cat;
    });
  });
  return res;
});

export const getActivePayees = memoizeOne((payees, accounts) => {
  let accountsById = getAccountsById(accounts);

  return payees.filter(payee => {
    if (payee.transfer_acct) {
      let account = accountsById[payee.transfer_acct];
      return account != null && !account.closed;
    }
    return true;
  });
});
