import { send } from '../../platform/client/fetch';

import { filterTransactions } from './queries';

export function categorize(accountId) {
  return async dispatch => {
    const res = await send('transactions-categorize', { accountId });
    if (res === 'ok') {
      dispatch(filterTransactions(null, accountId));
    }
  };
}
