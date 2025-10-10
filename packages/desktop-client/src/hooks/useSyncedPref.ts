import { useCallback } from 'react';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { saveSyncedPrefs } from '@desktop-client/prefs/prefsSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
  options?: { isGlobal?: boolean },
): [SyncedPrefs[K], SetSyncedPrefAction<K>] {
  const dispatch = useDispatch();
  const setPref = useCallback<SetSyncedPrefAction<K>>(
    value => {
      dispatch(
        saveSyncedPrefs({
          prefs: { [prefName]: value },
          isGlobal: options?.isGlobal,
        }),
      );
    },
    [prefName, dispatch, options?.isGlobal],
  );
  const pref = useSelector(state => state.prefs.synced[prefName]);

  return [pref, setPref];
}
