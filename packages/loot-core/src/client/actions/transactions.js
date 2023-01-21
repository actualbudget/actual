import { filterTransactions } from './queries';
import { send } from '../../platform/client/fetch';

export function categorize(accountId) {
  return async dispatch => {
    const res = await send('transactions-categorize', { accountId });
    if (res === 'ok') {
      dispatch(filterTransactions(null, accountId));
    }
  };
}
