import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

import * as Platform from 'loot-core/shared/platform';

const languages = import.meta.glob(['/locale/*.json', '!/locale/*_old.json']);

export const availableLanguages = Object.keys(languages).map(
  path => path.split('/')[2].split('.')[0],
);

const isLanguageAvailable = (language: string) =>
  Object.hasOwn(languages, `/locale/${language}.json`);

const loadLanguage = (language: string) => {
  if (!isLanguageAvailable(language)) {
    throw new Error(`Unknown locale ${language}`);
  }
  return languages[`/locale/${language}.json`]();
};

i18n
  .use(initReactI18next)
  .use(resourcesToBackend(loadLanguage))
  .init({
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
  if (!language) {
    // System default
    setI18NextLanguage(
      Platform.isPlaywright ? 'cimode' : navigator.language || 'en',
    );
    return;
  }

  if (!isLanguageAvailable(language)) {
    if (language === 'en') {
      // English is always available since we use natural-language keys.
      return;
    }

    if (language.includes('-')) {
      const fallback = language.split('-')[0];
      console.info(`Unknown locale ${language}, falling back to ${fallback}`);
      setI18NextLanguage(fallback);
      return;
    }

    const lowercaseLanguage = language.toLowerCase();
    if (lowercaseLanguage !== language) {
      console.info(
        `Unknown locale ${language}, falling back to ${lowercaseLanguage}`,
      );
      setI18NextLanguage(lowercaseLanguage);
      return;
    }

    // Fall back to English
    console.info(`Unknown locale ${language}, falling back to en`);
    setI18NextLanguage('en');
    return;
  }

  if (language === i18n.language) {
    return; // language is already set
  }

  i18n.changeLanguage(language || 'en');
};
