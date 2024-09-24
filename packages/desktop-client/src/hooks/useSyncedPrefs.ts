import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { savePrefs } from 'loot-core/client/actions';
import { type SyncedPrefs } from 'loot-core/src/types/prefs';

import { useLocalPrefs } from './useLocalPrefs';

type SetSyncedPrefsAction = (value: Partial<SyncedPrefs>) => void;

export function useSyncedPrefs(): [SyncedPrefs, SetSyncedPrefsAction] {
  // TODO: implement real logic (follow-up PR)
  const dispatch = useDispatch();
  const setPrefs = useCallback<SetSyncedPrefsAction>(
    newPrefs => {
      dispatch(savePrefs(newPrefs));
    },
    [dispatch],
  );

  return [useLocalPrefs(), setPrefs];
}
