import { useSelector } from 'react-redux';

import { type GlobalPrefs } from 'loot-core/types/prefs';

export function useGlobalPref<K extends keyof GlobalPrefs>(
  prefName: K,
): GlobalPrefs[K] {
  return useSelector(state => state.prefs.global?.[prefName]);
}
