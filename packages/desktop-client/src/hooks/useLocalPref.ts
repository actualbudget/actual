import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { savePrefs } from 'loot-core/src/client/actions';
import { type State } from 'loot-core/src/client/state-types';
import { type LocalPrefs } from 'loot-core/src/types/prefs';

type SetLocalPrefAction<K extends keyof LocalPrefs> = (
  value: LocalPrefs[K],
) => void;

export function useLocalPref<K extends keyof LocalPrefs>(
  prefName: K,
  defaultValue: LocalPrefs[K] = undefined,
): [LocalPrefs[K], SetLocalPrefAction<K>] {
  const dispatch = useDispatch();
  const setLocalPref = useCallback<SetLocalPrefAction<K>>(
    value => {
      dispatch(savePrefs({ [prefName]: value } as LocalPrefs));
    },
    [prefName, dispatch],
  );
  const localPref = useSelector(
    (state: State) => state.prefs.local?.[prefName] as LocalPrefs[K],
  );

  if (!localPref) {
    return [defaultValue, setLocalPref];
  }

  return [localPref, setLocalPref];
}
