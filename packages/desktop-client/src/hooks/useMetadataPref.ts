import { useCallback } from 'react';

import type { MetadataPrefs } from '@actual-app/core/types/prefs';

import { savePrefs } from '#prefs/prefsSlice';
import { useDispatch, useSelector } from '#redux';

type SetMetadataPrefAction<K extends keyof MetadataPrefs> = (
  value: MetadataPrefs[K],
) => void;

export function useMetadataPref<K extends keyof MetadataPrefs>(
  prefName: K,
): [MetadataPrefs[K], SetMetadataPrefAction<K>] {
  const dispatch = useDispatch();
  const setLocalPref = useCallback<SetMetadataPrefAction<K>>(
    value => {
      void dispatch(savePrefs({ prefs: { [prefName]: value } }));
    },
    [prefName, dispatch],
  );
  const localPref = useSelector(state => state.prefs.local?.[prefName]);

  return [localPref, setLocalPref];
}
