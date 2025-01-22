import { useMemo } from 'react';
import { useGlobalPref } from './useGlobalPref';
import { getLocale } from 'loot-core/shared/locale';

export function useLocale() {
  const [language] = useGlobalPref('language');
  const locale = useMemo(() => getLocale(language), [language]);
  return locale;
}
