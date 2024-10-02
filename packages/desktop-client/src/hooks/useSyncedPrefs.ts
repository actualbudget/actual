import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { saveSyncedPrefs } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';
import { type SyncedPrefs } from 'loot-core/src/types/prefs';

type SetSyncedPrefsAction = (value: Partial<SyncedPrefs>) => void;

/** @deprecated: please use `useSyncedPref` (singular) */
export function useSyncedPrefs(): [SyncedPrefs, SetSyncedPrefsAction] {
  const dispatch = useDispatch();
  const setPref = useCallback<SetSyncedPrefsAction>(
    newValue => {
      dispatch(saveSyncedPrefs(newValue));
    },
    [dispatch],
  );
  const pref = useSelector((state: State) => state.prefs.synced);

  return [pref, setPref];
}
