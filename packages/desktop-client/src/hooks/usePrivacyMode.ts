import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';

export function usePrivacyMode() {
  return useSelector(
    (state: State) => state.prefs.local?.isPrivacyEnabled ?? false,
  );
}
