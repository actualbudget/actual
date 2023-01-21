import throttle from 'throttleit';

import { send } from '../../platform/client/fetch';
import constants from '../constants';

import { pushModal } from './modals';
import { addNotification, addGenericErrorNotification } from './notifications';

export function applyBudgetAction(month, type, args) {
  return async function () {
    switch (type) {
      case 'budget-amount':
        await send('budget/budget-amount', {
          month,
          category: args.category,
          amount: args.amount
        });
        break;
      case 'copy-last':
        await send('budget/copy-previous-month', { month });
        break;
      case 'set-zero':
        await send('budget/set-zero', { month });
        break;
      case 'set-3-avg':
        await send('budget/set-3month-avg', { month });
        break;
      case 'hold':
        await send('budget/hold-for-next-month', {
          month,
          amount: args.amount
        });
        break;
      case 'reset-hold':
        await send('budget/reset-hold', { month });
        break;
      case 'cover':
        await send('budget/cover-overspending', {
          month,
          to: args.to,
          from: args.from
        });
        break;
      case 'transfer-available':
        await send('budget/transfer-available', {
          month,
          amount: args.amount,
          category: args.category
        });
        break;
      case 'transfer-category':
        await send('budget/transfer-category', {
          month,
          amount: args.amount,
          from: args.from,
          to: args.to
        });
        break;
      case 'carryover': {
        await send('budget/set-carryover', {
          startMonth: month,
          category: args.category,
          flag: args.flag
        });
        break;
      }
      default:
    }
  };
}

export function getCategories() {
  return async function (dispatch) {
    const categories = await send('get-categories');
    dispatch({
      type: constants.LOAD_CATEGORIES,
      categories
    });
    return categories;
  };
}

export function createCategory(name, groupId, isIncome) {
  return async function (dispatch) {
    let id = await send('category-create', {
      name,
      groupId,
      isIncome
    });
    dispatch(getCategories());
    return id;
  };
}

export function deleteCategory(id, transferId) {
  return async function (dispatch, getState) {
    let { error } = await send('category-delete', { id, transferId });

    if (error) {
      switch (error) {
        case 'category-type':
          dispatch(
            addNotification({
              type: 'error',
              message:
                'A category must be transferred to another of the same type (expense or income)'
            })
          );
          break;
        default:
          dispatch(addGenericErrorNotification());
      }

      throw new Error(error);
    } else {
      dispatch(getCategories());
      // Also need to refresh payees because they might use one of the
      // deleted categories as the default category
      dispatch(getPayees());
    }
  };
}

export function updateCategory(category) {
  return async dispatch => {
    await send('category-update', category);
    dispatch(getCategories());
  };
}

export function moveCategory(id, groupId, targetId) {
  return async (dispatch, getState) => {
    await send('category-move', { id, groupId, targetId });
    await dispatch(getCategories());
  };
}

export function moveCategoryGroup(id, targetId) {
  return async dispatch => {
    await send('category-group-move', { id, targetId });
    await dispatch(getCategories());
  };
}

export function createGroup(name) {
  return async dispatch => {
    let id = await send('category-group-create', { name });
    dispatch(getCategories());
    return id;
  };
}

export function updateGroup(group) {
  // Strip off the categories field if it exist. It's not a real db
  // field but groups have this extra field in the client most of the
  // time
  const { categories, ...rawGroup } = group;

  return async dispatch => {
    await send('category-group-update', rawGroup);
    await dispatch(getCategories());
  };
}

export function deleteGroup(id, transferId) {
  return async function (dispatch, getState) {
    await send('category-group-delete', { id, transferId });
    await dispatch(getCategories());
    // See `deleteCategory` for why we need this
    await dispatch(getPayees());
  };
}

export function getPayees() {
  return async function (dispatch) {
    let payees = await send('payees-get');
    dispatch({
      type: constants.LOAD_PAYEES,
      payees
    });
    return payees;
  };
}

export function initiallyLoadPayees() {
  return async function (dispatch, getState) {
    if (getState().queries.payees.length === 0) {
      return dispatch(getPayees());
    }
  };
}

export function createPayee(name) {
  return async dispatch => {
    return send('payee-create', { name: name.trim() });
  };
}

export function getAccounts() {
  return async function (dispatch) {
    const accounts = await send('accounts-get');
    dispatch({ type: constants.LOAD_ACCOUNTS, accounts });
    return accounts;
  };
}

export function updateAccount(account) {
  return async function (dispatch) {
    dispatch({ type: constants.UPDATE_ACCOUNT, account });
    await send('account-update', account);
  };
}

export function createAccount(name, type, balance, offBudget) {
  return async function (dispatch) {
    let id = await send('account-create', { name, type, balance, offBudget });
    await dispatch(getAccounts());
    await dispatch(getPayees());
    return id;
  };
}

export function openAccountCloseModal(accountId) {
  return async function (dispatch, getState) {
    const { balance, numTransactions } = await send('account-properties', {
      id: accountId
    });
    const account = getState().queries.accounts.find(
      acct => acct.id === accountId
    );

    dispatch(
      pushModal('close-account', {
        account,
        balance,
        canDelete: numTransactions === 0
      })
    );
  };
}

export function closeAccount(accountId, transferAccountId, categoryId, forced) {
  return async function (dispatch) {
    await send('account-close', {
      id: accountId,
      transferAccountId,
      categoryId,
      forced
    });
    dispatch(getAccounts());
  };
}

export function reopenAccount(accountId) {
  return async function (dispatch) {
    await send('account-reopen', { id: accountId });
    dispatch(getAccounts());
  };
}

export function forceCloseAccount(accountId) {
  return closeAccount(accountId, null, null, true);
}

let _undo = throttle(() => send('undo'), 100);
let _redo = throttle(() => send('redo'), 100);

let _undoEnabled = true;
export function setUndoEnabled(flag) {
  _undoEnabled = flag;
}

export function undo() {
  return async () => {
    if (_undoEnabled) {
      _undo();
    }
  };
}

export function redo() {
  return async () => {
    if (_undoEnabled) {
      _redo();
    }
  };
}
