import { useMemo } from 'react';

import { getLocale } from 'loot-core/shared/locale';

import { useGlobalPref } from './useGlobalPref';

export function useLocale() {
  const [language] = useGlobalPref('language');
  const locale = useMemo(
    () => getLocale(language ? language : (navigator.language ?? 'en-US')),
    [language],
  );
  return locale;
}
