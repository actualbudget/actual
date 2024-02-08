import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

export function useFailedAccounts() {
  return useSelector((state: State) => state.account.failedAccounts);
}
