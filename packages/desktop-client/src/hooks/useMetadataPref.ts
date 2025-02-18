import { useCallback } from 'react';

import { savePrefs } from 'loot-core/client/prefs/prefsSlice';
import { type MetadataPrefs } from 'loot-core/types/prefs';

import { useSelector, useDispatch } from '../redux';

type SetMetadataPrefAction<K extends keyof MetadataPrefs> = (
  value: MetadataPrefs[K],
) => void;

export function useMetadataPref<K extends keyof MetadataPrefs>(
  prefName: K,
): [MetadataPrefs[K], SetMetadataPrefAction<K>] {
  const dispatch = useDispatch();
  const setLocalPref = useCallback<SetMetadataPrefAction<K>>(
    value => {
      dispatch(savePrefs({ prefs: { [prefName]: value } }));
    },
    [prefName, dispatch],
  );
  const localPref = useSelector(state => state.prefs.local?.[prefName]);

  return [localPref, setLocalPref];
}
