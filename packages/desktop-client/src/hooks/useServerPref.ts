import { useCallback } from 'react';

import type { ServerPrefs } from '@actual-app/core/types/prefs';

import { saveServerPrefs } from '#prefs/prefsSlice';
import { useDispatch, useSelector } from '#redux';

type SetServerPrefAction<K extends keyof ServerPrefs> = (
  value: ServerPrefs[K],
) => void;

export function useServerPref<K extends keyof ServerPrefs>(
  prefName: K,
): [ServerPrefs[K], SetServerPrefAction<K>] {
  const dispatch = useDispatch();

  const setPref = useCallback<SetServerPrefAction<K>>(
    value => {
      void dispatch(
        saveServerPrefs({
          prefs: { [prefName]: value },
        }),
      );
    },
    [dispatch, prefName],
  );

  const pref = useSelector(state => state.prefs.server[prefName]);

  return [pref, setPref];
}
