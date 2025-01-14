import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

const languages = import.meta.glob(['/locale/*.json', '!/locale/*_old.json']);

export const availableLanguages = Object.keys(languages).map(
  path => path.split('/')[2].split('.')[0],
);

const isLanguageAvailable = (language: string) =>
  Object.hasOwn(languages, `/locale/${language}.json`);

const loadLanguage = (language: string) => {
  if (!isLanguageAvailable(language)) {
    console.error(`Unknown locale ${language}`);
    throw new Error(`Unknown locale ${language}`);
  }
  return languages[`/locale/${language}.json`]();
};

i18n
  .use(initReactI18next)
  .use(resourcesToBackend(loadLanguage))
  .init({
    // Set this to 'cimode' to see the exact keys without interpolation.
    lng: 'en',

    // allow keys to be phrases having `:`, `.`
    nsSeparator: false,
    keySeparator: false,
    // do not load a fallback
    fallbackLng: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      transSupportBasicHtmlNodes: false,
    },
  });

export const setI18NextLanguage = (language: string) => {
  if (language === 'en' && !isLanguageAvailable(language)) {
    // English is always ~available since we use natural-language keys.
    return;
  }

  if (!language) {
    // System default
    setI18NextLanguage(navigator.language || 'en');
    return;
  }

  language = language.toLowerCase();
  if (!availableLanguages.includes(language)) {
    if (language.includes('-')) {
      setI18NextLanguage(language.split('-')[0]);
      return;
    }

    console.error(`Unknown locale ${language}`);
    throw new Error(`Unknown locale ${language}`);
  }
  i18n.changeLanguage(language || 'en');
};
