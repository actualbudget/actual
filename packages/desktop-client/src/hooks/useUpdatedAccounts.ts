import { useSelector } from 'react-redux';

import { type State } from '../state';

export function useUpdatedAccounts() {
  return useSelector((state: State) => state.account.updatedAccounts);
}
