import { enUS } from 'date-fns/locale';

export function getLocale(language: string) {
  if (!language || typeof language !== 'string') {
    return enUS;
  }

  const localeKey = language.replace('-', '');

  // Dynamic import only the locale we need
  return import(`date-fns/locale/${localeKey.toLowerCase()}`)
    .then(module => module.default || module)
    .catch(() => {
      // If the full locale wasn't found, try with just the language part
      const shortKey = localeKey.substring(0, 2);
      if (shortKey !== localeKey) {
        return import(`date-fns/locale/${shortKey.toLowerCase()}`)
          .then(module => module.default || module)
          .catch(() => enUS);
      }
      return enUS;
    });
}
