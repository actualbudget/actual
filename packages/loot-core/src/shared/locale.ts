import * as locales from 'date-fns/locale';

export function getLocale(language: string) {
  if (!language || typeof language !== 'string') {
    return locales.enUS;
  }

  let localeKey = language.replace('-', '') as keyof typeof locales;

  if (localeKey in locales) {
    return locales[localeKey];
  }

  //if language was not found with four letters, try with two
  localeKey = language.replace('-', '').substring(0, 2) as keyof typeof locales;

  if (localeKey in locales) {
    return locales[localeKey];
  }

  return locales.enUS;
}
