import { useCallback } from 'react';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { saveSyncedPrefs } from '@desktop-client/prefs/prefsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

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
