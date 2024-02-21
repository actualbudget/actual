import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

export function useUpdatedAccounts() {
  return useSelector((state: State) => state.queries.updatedAccounts);
}
