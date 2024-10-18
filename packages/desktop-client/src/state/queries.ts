// @ts-strict-ignore
import memoizeOne from 'memoize-one';

import { groupById } from 'loot-core/src/shared/util';
import {
  type AccountEntity,
  type PayeeEntity,
} from 'loot-core/src/types/models';
import { type Handlers } from 'loot-core/types/handlers';

import { type QueriesActions } from './actions/queries';
import * as constants from './constants';

export type QueriesState = {
  accounts: AccountEntity[];
  accountsLoaded: boolean;
  categories: Awaited<ReturnType<Handlers['get-categories']>>;
  categoriesLoaded: boolean;
  commonPayeesLoaded: boolean;
  commonPayees: Awaited<ReturnType<Handlers['common-payees-get']>>;
  payees: Awaited<ReturnType<Handlers['payees-get']>>;
  payeesLoaded: boolean;
  earliestTransaction: unknown | null;
};

const initialState: QueriesState = {
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
  earliestTransaction: null,
};

export function update(
  state = initialState,
  action: QueriesActions,
): QueriesState {
  switch (action.type) {
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

// TODO: Move somewhere else
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

// TODO: Move somewhere else
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
