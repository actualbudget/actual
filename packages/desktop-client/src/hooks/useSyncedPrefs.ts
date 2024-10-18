import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { type SyncedPrefs } from 'loot-core/src/types/prefs';

import { type State } from '../state';
import { saveSyncedPrefs } from '../state/actions';

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
