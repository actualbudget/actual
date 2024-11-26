import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';

export function useFailedAccounts() {
  return useSelector((state: State) => state.account.failedAccounts);
}
