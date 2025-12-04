import * as localesNamespace from 'date-fns/locale';

// Spread into plain object to allow dynamic access without ESLint namespace warnings
const locales: Record<string, localesNamespace.Locale> = {
  ...localesNamespace,
};

export function getLocale(language: string) {
  if (!language || typeof language !== 'string') {
    return locales.enUS;
  }

  let localeKey = language.replace('-', '');

  if (localeKey in locales) {
    return locales[localeKey];
  }

  //if language was not found with four letters, try with two
  localeKey = language.replace('-', '').substring(0, 2);

  if (localeKey in locales) {
    return locales[localeKey];
  }

  return locales.enUS;
}
