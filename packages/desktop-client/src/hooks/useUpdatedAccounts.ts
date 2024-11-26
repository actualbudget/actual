import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';

export function useUpdatedAccounts() {
  return useSelector((state: State) => state.queries.updatedAccounts);
}
