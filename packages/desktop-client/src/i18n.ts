import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

const languages = import.meta.glob('/locale/*.json');

const loadLanguage = (language: string) => {
  const path = `/locale/${language}.json`;
  if (!Object.hasOwn(languages, path)) {
    console.error(`Unknown locale ${language}`);
    throw new Error(`Unknown locale ${language}`);
  }
  return languages[path]();
};

i18n
  .use(initReactI18next)
  .use(resourcesToBackend(loadLanguage))
  .init({
    // While we mark all strings for translations, one can test
    // it by setting the language in localStorage to their choice.
    // Set this to 'cimode' to see the exact keys without interpolation.
    lng: localStorage.getItem('language') || 'en',

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
