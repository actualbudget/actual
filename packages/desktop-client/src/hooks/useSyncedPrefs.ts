import { useCallback } from 'react';

import { saveSyncedPrefs } from 'loot-core/client/prefs/prefsSlice';
import { type SyncedPrefs } from 'loot-core/src/types/prefs';

import { useSelector, useDispatch } from '../redux';

type SetSyncedPrefsAction = (value: Partial<SyncedPrefs>) => void;

/** @deprecated: please use `useSyncedPref` (singular) */
export function useSyncedPrefs(): [SyncedPrefs, SetSyncedPrefsAction] {
  const dispatch = useDispatch();
  const setPrefs = useCallback<SetSyncedPrefsAction>(
    newValue => {
      dispatch(saveSyncedPrefs({ prefs: newValue }));
    },
    [dispatch],
  );
  const prefs = useSelector(state => state.prefs.synced);

  return [prefs, setPrefs];
}
