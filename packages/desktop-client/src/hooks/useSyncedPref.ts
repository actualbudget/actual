import { useCallback } from 'react';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { saveSyncedPrefs } from '../prefs/prefsSlice';
import { useSelector, useDispatch } from '../redux';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  const dispatch = useDispatch();
  const setPref = useCallback<SetSyncedPrefAction<K>>(
    value => {
      dispatch(saveSyncedPrefs({ prefs: { [prefName]: value } }));
    },
    [prefName, dispatch],
  );
  const pref = useSelector(state => state.prefs.synced[prefName]);

  return [pref, setPref];
}
