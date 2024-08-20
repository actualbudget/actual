import { type MetadataPrefs } from 'loot-core/src/types/prefs';

import { useLocalPref } from './useLocalPref';

type SetMetadataPrefAction<K extends keyof MetadataPrefs> = (
  value: MetadataPrefs[K],
) => void;

export function useMetadataPref<K extends keyof MetadataPrefs>(
  prefName: K,
): [MetadataPrefs[K], SetMetadataPrefAction<K>] {
  // TODO: implement logic for fetching the pref exclusively from the
  // metadata.json file (in follow-up PR)
  return useLocalPref(prefName);
}
