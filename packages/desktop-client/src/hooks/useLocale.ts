import { getLocale } from '@actual-app/core/shared/locale';

import { useGlobalPref } from './useGlobalPref';

/** The user's language code (BCP 47), falling back to the browser's. */
export function useLanguage() {
  const [language] = useGlobalPref('language');
  return language || navigator.language || 'en-US';
}

export function useLocale() {
  return getLocale(useLanguage());
}
