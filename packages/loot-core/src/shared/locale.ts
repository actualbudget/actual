import * as locales from 'date-fns/locale';

export function getLocale(language: string) {
  const localeKey = language.replace('-', '') as keyof typeof locales;

  if (localeKey in locales) {
    return locales[localeKey];
  }

  return locales.enUS;
}
