import { useSelector } from 'react-redux';

import { type State } from '../state';

export function useFailedAccounts() {
  return useSelector((state: State) => state.account.failedAccounts);
}
