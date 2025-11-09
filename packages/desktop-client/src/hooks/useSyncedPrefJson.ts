import { useCallback } from 'react';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { saveSyncedPrefs } from '@desktop-client/prefs/prefsSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

type SetSyncedPrefJsonAction<T> = (value: T) => void;

/**
 * Hook for synced preferences that store JSON data.
 * Handles JSON serialization/deserialization automatically.
 */
export function useSyncedPrefJson<
  K extends keyof SyncedPrefs,
  T = unknown,
>(
  prefName: K,
  defaultValue: T,
): [T, SetSyncedPrefJsonAction<T>] {
  const dispatch = useDispatch();
  const setPref = useCallback<SetSyncedPrefJsonAction<T>>(
    value => {
      dispatch(
        saveSyncedPrefs({
          prefs: { [prefName]: JSON.stringify(value) } as Partial<SyncedPrefs>,
        }),
      );
    },
    [prefName, dispatch],
  );
  const prefString = useSelector(state => state.prefs.synced[prefName]);

  let pref: T;
  if (prefString === undefined || prefString === null) {
    pref = defaultValue;
  } else {
    try {
      pref = JSON.parse(prefString as string);
    } catch {
      pref = defaultValue;
    }
  }

  return [pref, setPref];
}

