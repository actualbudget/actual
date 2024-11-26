import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type SyncedPrefs } from 'loot-core-shared/types/prefs';

import { saveSyncedPrefs } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';

type SetSyncedPrefsAction = (value: Partial<SyncedPrefs>) => void;

/** @deprecated: please use `useSyncedPref` (singular) */
export function useSyncedPrefs(): [SyncedPrefs, SetSyncedPrefsAction] {
  const dispatch = useDispatch();
  const setPrefs = useCallback<SetSyncedPrefsAction>(
    newValue => {
      dispatch(saveSyncedPrefs(newValue));
    },
    [dispatch],
  );
  const prefs = useSelector((state: State) => state.prefs.synced);

  return [prefs, setPrefs];
}
