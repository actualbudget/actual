import { useSelector } from 'react-redux';

import { type LocalPrefs } from 'loot-core/types/prefs';

export function useLocalPref<K extends keyof LocalPrefs>(
  prefName: K,
): LocalPrefs[K] {
  return useSelector(state => state.prefs.local?.[prefName]);
}
