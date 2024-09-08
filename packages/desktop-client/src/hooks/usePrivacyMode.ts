import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

export function usePrivacyMode() {
  return useSelector(
    (state: State) => String(state.prefs.local?.isPrivacyEnabled) === 'true',
  );
}
