import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

export function useLocalPrefs() {
  return useSelector((state: State) => state.prefs.local);
}
